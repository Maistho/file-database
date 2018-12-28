import { FileDatabase } from './FileDatabase'
import { join, resolve } from 'path'

jest.mock('./fs')

const DB_PATH = join(__dirname, 'test_db')
function getDB() {
  return new FileDatabase({ path: DB_PATH, leftPad: 3, jsonSpaces: 2 })
}

beforeEach(() => {
  const fs = require('./fs')
  fs.__setMockFiles({
    [join(DB_PATH, 'users/donald.json')]: JSON.stringify({
      id: 'donald',
      name: 'Donald Duck',
      address: '1313 Webfoot Street, Duckburg',
    }),
  })
})

test('creates a DB instance', () => {
  const db = getDB()
  expect(db).toBeDefined()
})

test('resolves a path', async () => {
  const db = getDB()
  expect(db.resolvePath('users')).toEqual(resolve(DB_PATH, 'users'))
})

test('resolves a nested path', async () => {
  const db = getDB()
  expect(db.resolvePath('users/donald')).toEqual(resolve(DB_PATH, 'users/donald'))
})

test('fetches data', async () => {
  const db = getDB()
  const users = await db.get('users')
  const userData = await Promise.all(
    Object.keys(users)
      .filter(key => !key.startsWith('$'))
      .map(key => db.get(`${users.$path}/${key}`)),
  )

  expect(users).toMatchInlineSnapshot(`
Object {
  "$path": "users",
  "donald": null,
}
`)
  expect(userData).toMatchInlineSnapshot(`
Array [
  Object {
    "$path": "users/donald",
    "address": "1313 Webfoot Street, Duckburg",
    "id": "donald",
    "name": "Donald Duck",
  },
]
`)
})

test('writes data', async () => {
  const db = getDB()
  const daisy = {
    id: 2,
    name: 'Daisy Duck',
    address: '1234 Flower Avenue, Duckburg',
  }
  await db.set('users/daisy', daisy)
  const dbDaisy = await db.get('users/daisy')
  expect(dbDaisy).toMatchObject(daisy)
})
