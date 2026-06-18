const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── Oracle Connection Config ──
const DB_CONFIG = {
  user: 'SYS',
  password: 'Demodogs5',
  connectString: 'localhost:1521/xe',
  privilege: oracledb.SYSDBA
};

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const TABLES = [
  'Users', 'Customers', 'Sellers', 'Categories', 'Warehouse',
  'Products', 'Coupon', 'Orders', 'Payment', 'Shipment',
  'Order_Items', 'Reviews', 'Product_Warehouse'
];

// ── Format date values to DD-MON-YYYY ──
function formatRow(row) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const formatted = {};
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (val instanceof Date) {
      const d = val.getDate().toString().padStart(2,'0');
      const m = months[val.getMonth()];
      const y = val.getFullYear();
      formatted[key] = `${d}-${m}-${y}`;
    } else {
      formatted[key] = val;
    }
  }
  return formatted;
}

// ── GET all rows from a table ──
app.get('/api/:table', async (req, res) => {
  const table = req.params.table;
  if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
  let conn;
  try {
    conn = await oracledb.getConnection(DB_CONFIG);
    const result = await conn.execute(`SELECT * FROM ${table}`);
    const columns = result.metaData.map(c => c.name);
    const rows = result.rows.map(r => {
      const obj = {};
      columns.forEach((c, i) => { obj[c] = r[i] ?? r[c] ?? ''; });
      return formatRow(obj);
    });
    res.json({ columns, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ── POST add a new row ──
app.post('/api/:table', async (req, res) => {
  const table = req.params.table;
  if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
  const data = req.body;
  const keys = Object.keys(data).filter(k => data[k] !== '' && data[k] !== null);
  const vals = keys.map((_, i) => `:${i + 1}`);
  let conn;
  try {
    conn = await oracledb.getConnection(DB_CONFIG);
    await conn.execute(
      `INSERT INTO ${table} (${keys.join(',')}) VALUES (${vals.join(',')})`,
      keys.map(k => data[k]),
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ── PUT update a row ──
app.put('/api/:table', async (req, res) => {
  const table = req.params.table;
  if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
  const { newRow, whereCol, whereVal } = req.body;
  const keys = Object.keys(newRow).filter(k => newRow[k] !== undefined);
  const setClause = keys.map((k, i) => `${k}=:${i + 1}`).join(',');
  let conn;
  try {
    conn = await oracledb.getConnection(DB_CONFIG);
    await conn.execute(
      `UPDATE ${table} SET ${setClause} WHERE ${whereCol}=:${keys.length + 1}`,
      [...keys.map(k => newRow[k]), whereVal],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ── DELETE a row ──
app.delete('/api/:table', async (req, res) => {
  const table = req.params.table;
  if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
  const { whereCol, whereVal } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(DB_CONFIG);
    await conn.execute(
      `DELETE FROM ${table} WHERE ${whereCol}=:1`,
      [whereVal],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ── Start Server ──
app.listen(3000, () => {
  console.log('');
  console.log('  ✅  ShopBase server running!');
  console.log('  🌐  Open this in your browser:');
  console.log('  👉  http://localhost:3000');
  console.log('');
});