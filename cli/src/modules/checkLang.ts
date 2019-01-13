const colors = require('colors');
const cliSpinners = require('cli-spinners');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');

const spinnerDocker = ora({
  text: 'Starting container...'.blue,
  color: 'blue',
  hideCursor: true
})

const languages = [
  {
    lang: 'Node',
    file: 'package.json'
  },
  {
    lang: 'Ruby',
    file: 'Gemfile'
  },
  {
    lang: 'Python',
    file: 'requirements.txt'
  },
]

export default function checkLanguage(folderName: any) {
  languages.forEach(l => {
    const detect = path.join(__dirname, '../../', folderName, l.file)
    if (fs.existsSync(detect)) {
      const textToDisplay = l.lang + ' app detected'
      spinnerDocker.info(textToDisplay.blue)
    }
  })
}
