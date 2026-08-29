/**
 * Prints an INSERT statement for a login account, for pasting into
 * phpMyAdmin when a host gives you no terminal to run `db:seed` in.
 *
 * bcrypt hashing can't be done in SQL, so the hash is computed here and
 * embedded in the statement.
 *
 *   npm run make:user -- 'MyPassword' [email] [SUPER_ADMIN|ADMIN|EMPLOYEE] [name]
 */
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'

const [password, email = 'superadmin@whitespace.test', role = 'SUPER_ADMIN', name = 'Super Admin'] =
  process.argv.slice(2)

if (!password) {
  console.error("Usage: npm run make:user -- 'YourPassword' [email] [role] [name]")
  process.exit(1)
}
if (!['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(role)) {
  console.error(`Invalid role "${role}". Use SUPER_ADMIN, ADMIN or EMPLOYEE.`)
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)
// cuid-shaped id isn't required — any unique string works as the primary key.
const id = 'usr' + randomUUID().replace(/-/g, '').slice(0, 22)

console.log(`
-- Paste this into phpMyAdmin -> your database -> SQL tab -> Go
INSERT INTO \`User\` (\`id\`, \`name\`, \`email\`, \`passwordHash\`, \`role\`, \`status\`, \`createdAt\`, \`updatedAt\`)
VALUES ('${id}', '${name.replace(/'/g, "''")}', '${email}', '${hash}', '${role}', 'active', NOW(3), NOW(3));
`)
