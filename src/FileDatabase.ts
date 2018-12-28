import { resolve, join, basename } from 'path'
import { readFile, readdir, writeFile } from './fs'
import { formatWithOptions } from 'util'

export interface FileDatabaseOptions {
  /**
   * Path to database directory
   * @required
   */
  path: string
  /**
   * How much, if at all, to pad left of arrays with zeros
   * @default 0
   */
  leftPad?: number
  /**
   * What prefix to use for metadata on returned objects
   * @default '$'
   */
  prefix?: string
  /**
   * How many spaces to use when formatting JSON
   * @default 0
   */
  jsonSpaces?: number
}

interface GetOptions {
  depth?: number
}

export class FileDatabase {
  private path!: string
  private leftPad = 0
  private prefix = '$'
  private jsonSpaces = 0

  constructor(options: FileDatabaseOptions)
  constructor(path: string)
  constructor(pathOrOptions: string | FileDatabaseOptions) {
    let options
    if (typeof pathOrOptions === 'string') {
      options = { path: pathOrOptions }
    } else {
      options = pathOrOptions
    }

    if (!options.path) {
      throw new Error('Missing path!')
    }

    this.setOptions(options)
  }

  setOptions(options: FileDatabaseOptions) {
    this.path = options.path || this.path
    this.leftPad = options.leftPad || this.leftPad
  }

  async get<T = any>(path: string, options?: GetOptions): Promise<T> {
    const depth = (options && options.depth) || 0
    const resolvedPath = this.resolvePath(path)
    const [file, dir] = await Promise.all([
      this.readFile(resolvedPath + '.json'),
      this.readDir(resolvedPath),
    ])
    let result: any = {
      [`${this.prefix}path`]: path,
    }
    if (file) {
      Object.assign(result, file)
    }
    if (dir.content) {
      if (dir.metadata.type === 'array') {
        result = await Promise.all(dir.content.map(c => this.get(join(path, c), { depth })))
      } else if (depth === 0) {
        for (const c of dir.content) {
          Object.assign(result, { [c]: null })
        }
      } else {
        const content = await Promise.all(
          dir.content.map(c => this.get(join(path, c), { depth: depth - 1 })),
        )
        for (let i = 0; i < content.length; ++i) {
          Object.assign(result, {
            [dir.content[i]]: content[i],
          })
        }
      }
    }
    return result
  }

  async set(path: string, object: Object | Array<any>): Promise<void> {
    path = this.resolvePath(path)
    this.writeFile(path + '.json', object)
  }

  private async readDir(directoryPath: string) {
    let dir: string[] = []
    try {
      dir = await readdir(directoryPath)
    } catch (err) {}
    let metadata = { type: 'object' }
    const content = new Set<string>()
    for (const entry of dir) {
      if (entry === '_metadata.json') {
        metadata = await this.readFile(join(directoryPath, entry))
      } else if (entry.endsWith('.json')) {
        content.add(entry.substr(0, entry.length - '.json'.length))
      } else {
        content.add(entry)
      }
    }

    return { metadata, content: Array.from(content) }
  }
  private async readFile(filename: string) {
    try {
      const file = await readFile(filename)
      return JSON.parse(file.toString())
    } catch (err) {}
  }

  private async writeFile(filename: string, content: Object | Array<any>) {
    try {
      const serialized = JSON.stringify(content, undefined, this.jsonSpaces)
      await writeFile(filename, serialized)
    } catch (err) {
      console.warn(err)
    }
  }

  resolvePath(path: string) {
    if (this.leftPad) {
      let filename = basename(path)
      if (Number(filename).toString() === filename) {
        filename = filename.padStart(this.leftPad, '0')
      }
      path = join(path, '../', filename)
    }
    return resolve(this.path, path)
  }
}
