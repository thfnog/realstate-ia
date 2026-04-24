const bcrypt = require('bcryptjs');

const password = 'admin123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('--- PASSWORD HASH GENERATOR ---');
console.log('Password:', password);
console.log('Bcrypt Hash:', hash);
console.log('-------------------------------');
console.log('Copy the hash above and paste it into the "hash_senha" column in your Supabase "usuarios" table.');
