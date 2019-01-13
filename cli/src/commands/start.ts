import { Command, flags } from '@oclif/command'
import {Color, green, red} from 'colors'
import * as fs from 'fs-extra'
import * as yaml from 'js-yaml'
import * as ora from 'ora'
const Docker = require('dockerode')
const docker = new Docker({ socketPath: '/var/run/docker.sock' })
const path = require('path')
const cliSpinners = require('cli-spinners')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)
import checkLang from '../modules/checkLang'

export default class Start extends Command {
  static description = 'Start already created containers'

  static examples = [
    `$ sky start
Start all created containers`,
    `$ sky start <container_name>
Start a particular container`
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    file: flags.string({ char: 'f', description: 'Skyfile path', default: '.' }),
    container: flags.string({char: 'c', description: 'Container name to stop'})
  }

  async run() {
    const { args, flags } = this.parse(Start)

    if (flags.file === '.') {
      const spinnerDocker = ora({
        text: 'Starting image build...'.blue,
        color: 'blue',
        hideCursor: true
      })
      if (flags.file === '.') {
        const file = fs.readFileSync(__dirname + '/../Skyfile.yml')
        const doc = yaml.safeLoad(file.toString())
        let spinnerFile = ora({
          text: 'Searching for Skyfile...'.blue,
          color: 'blue',
          hideCursor: true
        })
        let spinnerDocker = ora({
          text: 'Starting container(s)'.blue,
          color: 'blue',
          hideCursor: true
        })
        spinnerFile.succeed(green('Skyfile found'))
        doc.services.forEach((service: any) => {
          const serviceName = Object.keys(service)[0]
          const folderName = service[serviceName].build
          const needToRun = service[serviceName].run
          if (needToRun) {
            spinnerDocker.start()
            const containers = db.get('service').value()
            containers.forEach((container: any) => {
              if (!container.isContainerRunning) {
                docker.getContainer(container.containerID).start()
                db.get('service').find({ name: serviceName }).assign({ isContainerRunning: true }).write()
                spinnerDocker.info(`Container ${container.name} started`.blue)
              }
            })
            spinnerDocker.succeed('Container(s) started'.green)
          }
        })
      }
    }
  }
}
