import { Shop } from '../../types';
import { Store, CheckCircle2 } from '../ui/Icon';

interface ShopModalProps {
  isOpen: boolean;
  shops: Shop[];
  currentShop: Shop | null;
  onSelectShop: (shopId: string) => void;
  onClose: () => void;
}

export function ShopModal({
  isOpen,
  shops,
  currentShop,
  onSelectShop,
  onClose,
}: ShopModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(13, 37, 61, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 2000,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          width: 'min(420px, 92vw)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#13283b' }}>
              Select Active Branch
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#778899' }}>
              Switch dashboard context to another retail location
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 0,
              background: '#f1f5f8',
              borderRadius: '50%',
              width: 30,
              height: 30,
              cursor: 'pointer',
              fontSize: 16,
              color: '#556677',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {shops.map((s) => {
            const isSelected = s.id === currentShop?.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  onSelectShop(s.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #147c70' : '1px solid #dce4e8',
                  background: isSelected ? '#f0f9f7' : '#ffffff',
                  transition: 'all 0.12s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isSelected ? '#e2f5f0' : '#f0f4f7',
                      color: isSelected ? '#147c70' : '#64748b',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Store size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 14, color: '#13283b', display: 'block' }}>{s.name}</strong>
                    <span style={{ fontSize: 11, color: '#778899' }}>{s.address || 'Retail Branch'}</span>
                  </div>
                </div>

                {isSelected && <CheckCircle2 size={18} color="#147c70" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
