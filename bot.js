// Modules import
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
const queue = new Map();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapters = new FileSync('database.json');
const Database = low(adapters);
Database.defaults({
  xp: [],
}).write();

// Local files import
const IDENTIFIERS = require('./private_keys.js');
const BOT_CONFIG = require('./config.js');

// Bot status messages
client.once('ready', () => {
  console.log('Ready!');
});
client.once('reconnecting', () => {
  console.log('Reconnecting!');
});
client.once('disconnect', () => {
  console.log('Disconnect!');
});

// User's messages reading
client.on('message', async (message) => {
  // Ignore if user is bot itself
  if (message.author.bot) return;

  // If the message does not start with the command prefix, return
  if (!message.content.startsWith(BOT_CONFIG.COMMAND_PREFIX)) return;

  // USER EXPERIENCE START
  /*var msgAuthor = message.author.id;

    if (!Database.get("xp").find({ users: msgAuthor }).value()) {
        // If the user does not exist in the DB, create a new entry for him/her
        Database.get("xp").push({ users: msgAuthor, xp: 1}).write();
    }
    else {
        var userExpJSON = Database.get("xp").filter({ users: msgAuthor }).find("xp").value();
        var userXP = Object.values(userExpJSON);

        Database.get("xp").find({ users: msgAuthor }).assign({ xp: userXP[1] += 1 }).write();
        var embedMessage = null;

        if (message.content.startsWith(`${BOT_CONFIG.COMMAND_PREFIX}xp`)) {
            // Check user's xp points
            if (message.content === BOT_CONFIG.COMMAND_PREFIX + "xp") {
                var xp = Database.get("xp").filter({
                    users: msgAuthor
                }).find('xp').value();
                var xpfinal = Object.values(xp);

                embedMessage = new Discord.RichEmbed()
                    .setColor('#1abc9c')
                    .setTitle(message.author.username + "'s experience points")
                    .setThumbnail(message.author.avatarURL)
                    .addField("This user currently has :", `${xpfinal[1]} experience points.`)
                    .setFooter("Bot provided by Mitsuriou.", "https://cdn.discordapp.com/avatars/200928108080136192/a465a128caf1bb6b79ef43548ef0393d.png?size=2048");
            }

            // Check other's xp points
            if (message.mentions.users.first()) {
                var xp = Database.get("xp").filter({
                    users: message.mentions.users.first().id
                }).find('xp').value();

                if (xp) {
                    var xpfinal = Object.values(xp);

                    embedMessage = new Discord.RichEmbed()
                        .setColor('#1abc9c')
                        .setTitle(message.mentions.users.first().username + "'s experience points")
                        .setThumbnail(client.users.get(message.mentions.users.first().id).avatarURL)
                        .addField("This user currently has :", `${xpfinal[1]} experience points.`)
                        .setFooter("Bot provided by Mitsuriou.", "https://cdn.discordapp.com/avatars/200928108080136192/a465a128caf1bb6b79ef43548ef0393d.png?size=2048");
                } else {
                    embedMessage = new Discord.RichEmbed()
                        .setColor('#1abc9c')
                        .setTitle(message.mentions.users.first().username + "'s experience points")
                        .setThumbnail(client.users.get(message.mentions.users.first().id).avatarURL)
                        .addField("This user does not have any experience point.", "Start typing messages to rank up !")
                        .setFooter("Bot provided by Mitsuriou.", "https://cdn.discordapp.com/avatars/200928108080136192/a465a128caf1bb6b79ef43548ef0393d.png?size=2048");
                }
            }
        }
        if (message != null) {
            message.channel.send(embedMessage);
        }
        return;
    }*/
  // USER EXPERIENCE END

  // Create a messages queue
  const serverQueue = queue.get(message.guild.id);

  // MUSIC START
  if (message.content.startsWith(`${BOT_CONFIG.COMMAND_PREFIX}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${BOT_CONFIG.COMMAND_PREFIX}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${BOT_CONFIG.COMMAND_PREFIX}stop`)) {
    stop(message, serverQueue);
    return;
  }
  // MUSIC END
  else {
    message.channel.send('You need to enter a valid command!');
  }
});

// FUNCTIONS
/**
 *
 * @param {*} message
 * @param {*} serverQueue
 */
async function execute(message, serverQueue) {
  const args = message.content.split(' ');

  const voiceChannel = message.member.voiceChannel;
  if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.channel.send('I need the permissions to join and speak in your voice channel!');
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

/**
 *
 * @param {*} message
 * @param {*} serverQueue
 */
function skip(message, serverQueue) {
  if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
  if (!serverQueue) return message.channel.send('There is no song that I could skip!');
  serverQueue.connection.dispatcher.end();
}

/**
 *
 * @param {*} message
 * @param {*} serverQueue
 */
function stop(message, serverQueue) {
  if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

/**
 *
 * @param {*} guild
 * @param {*} song
 */
function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .playStream(ytdl(song.url))
    .on('end', () => {
      // console.log('Music ended!');
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', (error) => {
      console.error(error);
    });
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

// Start the bot
client.login(IDENTIFIERS.DISCORD_DEV_TOKEN);
