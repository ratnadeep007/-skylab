import {Command, flags} from "@oclif/command";

export default class Music extends Command {
  static description = 'Play music from Skyfile'

  static examples = [
    `$ sky music
Plays music defined local in Skyfile\n`,
    `$ sky music -f <file_name>
Plays music defined in <file_name>\n`,
    `$ sky music -y <youtube_video_link>
Plays audio of <youtube_video_link>\n`,
    `$ sky music -p <youtube_playlist_link>
Plays audio of playlist\n`
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    file: flags.string({ char: 'f', description: 'Skyfile to play file from'}),
    youtube: flags.string({ char: 'y', description: 'Plays audio of <youtube_video_link>'}),
    playlist: flags.string({ char: 'p', description: 'Plays audio of playlist'})
  }

  async run() {
    const { args, flags } = this.parse(Music)

  }
}
