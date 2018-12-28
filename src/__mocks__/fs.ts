import { join, basename } from 'path'

const fs: any = jest.genMockFromModule('../fs')

let mockFiles: { [key: string]: any } = {}

async function readFile(path: string) {
  return mockFiles[path]
}

async function readdir(path: string) {
  return Object.keys(mockFiles)
    .filter(filename => filename.startsWith(path + '/'))
    .map(filename => basename(filename))
}
async function writeFile(path: string, content: string) {
  mockFiles[path] = content
}

function __setMockFiles(_mockFiles: any) {
  mockFiles = _mockFiles
}

fs.readFile = readFile
fs.readdir = readdir
fs.writeFile = writeFile
fs.__setMockFiles = __setMockFiles

module.exports = fs
