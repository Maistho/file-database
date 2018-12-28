# file-database

## Installation

```
yarn add file-database
```

## Usage

```js
const path = require('path')
const { FileDatabase } = require('file-database')

const db = new FileDatabase(path.join(__dirname, 'my_db_folder'))
const users = await db.get('users', { depth: Infinity })
```

## License

MIT
