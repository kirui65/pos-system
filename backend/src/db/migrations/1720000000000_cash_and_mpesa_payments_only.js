/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql("ALTER TABLE payments DROP CONSTRAINT payments_method_check; ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK(method IN ('cash','mobile_money')); ");
};

exports.down = (pgm) => {
  pgm.sql("ALTER TABLE payments DROP CONSTRAINT payments_method_check; ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK(method IN ('cash','mobile_money','card','credit')); ");
};
