/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE sales ALTER COLUMN device_id DROP NOT NULL;
    ALTER TABLE shifts ALTER COLUMN device_id DROP NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE sales ALTER COLUMN device_id SET NOT NULL;
    ALTER TABLE shifts ALTER COLUMN device_id SET NOT NULL;
  `);
};
