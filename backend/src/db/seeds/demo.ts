import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { pool } from '../pool';

const products = [
  ['Milk 500ml', 'MILK-500', 7000, 9000], ['Bread Loaf', 'BREAD-800', 5500, 7000], ['Sugar 1kg', 'SUGAR-1K', 14000, 16500],
  ['Rice 2kg', 'RICE-2K', 25000, 30000], ['Cooking Oil 1L', 'OIL-1L', 23000, 27000], ['Soda 500ml', 'SODA-500', 4500, 6000],
  ['Soap Bar', 'SOAP-125', 6500, 8500], ['Tea Leaves 250g', 'TEA-250', 12000, 15000], ['Eggs Tray', 'EGGS-30', 42000, 50000], ['Maize Flour 2kg', 'FLOUR-2K', 13500, 16000],
] as const;

async function main() {
  if (env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query("SELECT id FROM businesses WHERE name = 'Demo Supermarket' AND deleted_at IS NULL");
    if (existing.rowCount) { console.log('Demo Supermarket already exists; seed skipped.'); await client.query('ROLLBACK'); return; }
    const businessId = randomUUID();
    await client.query('INSERT INTO businesses(id,name,status) VALUES($1,$2,$3)', [businessId, 'Demo Supermarket', 'active']);
    const password = await bcrypt.hash('DemoPass123!', 12); const pin = await bcrypt.hash('1234', 12);
    const managerId = randomUUID(); const cashierOne = randomUUID(); const cashierTwo = randomUUID();
    for (const [id, name, email, role, passwordHash, pinHash] of [[managerId,'Demo Manager','manager@demo.local','manager',password,null],[cashierOne,'Cashier One',null,'cashier',null,pin],[cashierTwo,'Cashier Two',null,'cashier',null,pin]] as const) {
      await client.query('INSERT INTO users(id,business_id,full_name,email,role,password_hash,pin_hash) VALUES($1,$2,$3,$4,$5,$6,$7)', [id,businessId,name,email,role,passwordHash,pinHash]);
    }
    const shops = [[randomUUID(),'Demo CBD Shop'],[randomUUID(),'Demo Westlands Shop']] as const;
    for (const [id,name] of shops) await client.query('INSERT INTO shops(id,business_id,name,address) VALUES($1,$2,$3,$4)', [id,businessId,name,'Nairobi, Kenya']);
    for (const userId of [managerId,cashierOne,cashierTwo]) for (const [shopId] of shops) await client.query('INSERT INTO user_shops(user_id,shop_id,business_id) VALUES($1,$2,$3)', [userId,shopId,businessId]);
    const categories = new Map<string,string>();
    for (const name of ['Groceries','Drinks','Household']) { const id=randomUUID(); categories.set(name,id); await client.query('INSERT INTO categories(id,business_id,name) VALUES($1,$2,$3)',[id,businessId,name]); }
    for (let index=0; index < products.length; index++) { const [name,barcode,cost,price]=products[index]; const productId=randomUUID(); const categoryId=categories.get(index < 5 ? 'Groceries' : index < 7 ? 'Drinks' : 'Household'); await client.query('INSERT INTO products(id,business_id,category_id,name,sku,barcode,cost_price_minor,selling_price_minor) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[productId,businessId,categoryId,name,barcode,barcode,cost,price]); for (const [shopId] of shops) { await client.query('INSERT INTO shop_products(shop_id,product_id,business_id) VALUES($1,$2,$3)',[shopId,productId,businessId]); await client.query('INSERT INTO stock_levels(shop_id,product_id,business_id,quantity) VALUES($1,$2,$3,$4)',[shopId,productId,businessId,100]); await client.query("INSERT INTO stock_movements(business_id,shop_id,product_id,type,quantity_change,unit_cost_minor,reason) VALUES($1,$2,$3,'receive',$4,$5,$6)",[businessId,shopId,productId,100,cost,'Opening stock']); } }
    await client.query('INSERT INTO super_admins(email,password_hash) VALUES($1,$2)', ['admin@pos.local', password]);
    await client.query('COMMIT');
    console.log('Demo seed complete. Manager: manager@demo.local / DemoPass123!; Cashiers: PIN 1234; Super admin: admin@pos.local / DemoPass123!');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); await pool.end(); }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
