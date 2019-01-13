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


export default class Build extends Command {
  static description = 'Build images declared in Skyfile'

  static examples = [
    `$ sky build
Builds from local Skyfile`
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    file: flags.string({char: 'f', description: 'Skyfile path', default: '.'}),
  }

  // static args = [{name: 'file'}]

  createImage(folderName: any, serviceName: any, doRun: any, context: any) {
    const spinnerDocker = ora({
      text: 'Starting image build...'.blue,
      color: 'blue',
      hideCursor: true
    })
    spinnerDocker.start()
    spinnerDocker.text = 'Building image...'.blue
    docker.buildImage({
      context: path.join(__dirname, '../../', folderName),
      src: ['.']
    }, {t: serviceName + '-image'}, function (error: any, response: any) {
      if (error) {
        spinnerDocker.fail('Failed to create image'.red)
        return console.error(error)
      }
      response.on('data', (res: any) => {
        const data = JSON.parse(res);
        // console.log(data.stream);
      })
      response.on('end', function () {
        spinnerDocker.succeed('Image build done'.green);
        // db.set('service.isImageBuild', true).write()
        db.get('service').find({ name:serviceName}).assign({isImageBuild: true}).write()
        if (doRun) {
          runContainer(folderName, serviceName, context)
        }
      })
    })
  }



  async run() {
    const { args, flags } = this.parse(Build)
    db.defaults({ service: [], count: 0 })
      .write()
    if (flags.file === '.') {
      try {
        const file = fs.readFileSync(__dirname + '/../Skyfile.yml')
        const doc = yaml.safeLoad(file.toString())
        let spinnerFile = ora({
          text: 'Searching for Skyfile...'.blue,
          color: 'blue',
          hideCursor: true
        })
        spinnerFile.succeed(green('Skyfile found'))
        doc.services.forEach((service: any) => {
          // console.log(Object.keys(service));
          const serviceName = Object.keys(service)[0]
          const folderName = service[serviceName].build
          const needToRun = service[serviceName].run
          const port = service[serviceName].port
          const cmd = service[serviceName].cmd
          const context = {
            ExposedPorts: port,
            Cmd: cmd
          }
          db.get('service').push({name: serviceName}).write()
          this.createImage(folderName, serviceName, needToRun, context)
        })
      } catch (err) {
        this.log(err)
      }
    }
  }
}

function runContainer(folderName: any, serviceName: any, context: any) {
  const spinnerDocker = ora({
    text: 'Starting container...'.blue,
    color: 'blue',
    hideCursor: true
  })
  checkLang(folderName)
  spinnerDocker.start()
  const exposedPorts = `${context.ExposedPorts}/tcp`
  const portBindings = `${exposedPorts}`
  const createOptions = {
    Hostname: serviceName,
    HostConfig: {
      PortBindings: {
      }
    },
    ExposedPorts: {
    },
    name: serviceName,
  }
  createOptions['HostConfig']['PortBindings'][portBindings] = [{ HostPort: `${context.ExposedPorts}` }]
  createOptions['ExposedPorts'][exposedPorts] = {}
  docker.run(serviceName + '-image', context.Cmd, process.stdout, createOptions, function (err: any, data: any, container: any) {
    if (err) {
      spinnerDocker.fail('Failed to start cotnainer'.red)
      // db.set('service.isContainerRunning', false).write()
      db.get('service').find({ name:serviceName}).assign({isContainerRunning: false}).write()
      return console.error(err)
    }
  }).on('container', function (container: any) {
    spinnerDocker.succeed('Container started'.green)
    // db.set('service.isContainerRunning', true).write()
    // db.set('service.containerId', container.id).write()
    db.get('service').find({ name: serviceName }).assign({ isContainerRunning: true }).write()
    db.get('service').find({ name:serviceName}).assign({containerID: container.id}).write()
    return ''
  })
}
