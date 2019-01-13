import { Command, flags } from '@oclif/command'
import {Color, green, red} from 'colors'
import * as fs from 'fs-extra'
import * as yaml from 'js-yaml'
import * as ora from 'ora'
const Docker = require('dockerode')
const docker = new Docker({ socketPath: '/var/run/docker.sock' })
const path = require('path')
const cliSpinners = require('cli-spinners')
import checkLang from '../modules/checkLang'


export default class Build extends Command {
  static description = 'Build images declared in Skyfile'

  static examples = [
    '$ sky build'
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
        return console.error(error)
      }
      response.on('data', (res: any) => {
        const data = JSON.parse(res);
        // console.log(data.stream);
      })
      response.on('end', function () {
        spinnerDocker.succeed('Image build done'.green);
        if (doRun) {
          runContainer(folderName, serviceName, context)
        }
      })
    })
  }



  async run() {
    const {args, flags} = this.parse(Build)
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
    }
  }
  createOptions['HostConfig']['PortBindings'][portBindings] = [{ HostPort: `${context.ExposedPorts}` }]
  createOptions['ExposedPorts'][exposedPorts] = {}
  docker.run(serviceName + '-image', context.Cmd, process.stdout, createOptions)
    .then(function (container: any) {
      console.log('container data', container)
      spinnerDocker.succeed('Container started'.green)
    }).catch(function (err: any) {
      spinnerDocker.fail('Fail to start container'.red)
      console.log(err)
    })
}
