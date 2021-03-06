require('@babel/polyfill/noConflict');
import winston from 'winston';
import Discord from 'discord.js';

import CardAPI from './api';
import responses from './responses';
import ForumPosts from './forum';

const auth = require('./auth.json');
const {servers} = require('./config/server_ids.json');

// Configure logger settings
const logger = winston.createLogger({
	level: 'debug',
	format: winston.format.combine(
		winston.format.colorize(),
		winston.format.simple()
	),
	transports: [
		new winston.transports.Console()
	]
});

// Initialize the API
CardAPI(logger);

// Initialize Discord Bot
const bot = new Discord.Client();
const fp = new ForumPosts(bot);

bot.on('ready', () => {
	logger.info('Logged in as: ' + bot.user);
	bot.user.setActivity('!commands');
	fp.checkMessages();
});

// Automatically reconnect if the bot disconnects
let stackTrace = "";
bot.on('disconnect', (CloseEvent) => {
	logger.warn('Reconnecting, ' + CloseEvent.code);
	bot.login(auth.token)
	.then(() => {
		if (stackTrace) {
			logger.error(stackTrace);
			let channel = bot.channels.get(servers.develop.channels.errors);
			if (channel) channel.send(stackTrace).catch(logger.error);
			stackTrace = "";
		}
	});
});

// Respones
bot.on('message', msg => responses.call(bot, msg, logger));

// Ban Spam
bot.on('guildMemberAdd', (member) => {
	if (member.displayName.match(new RegExp("(quasar$)|(discord\.me)|(discord\.gg)|(bit\.ly)|(twitch\.tv)|(twitter\.com)", "i"))) {
		if (member.bannable) member.ban().then(() => {
			logger.warn('Banned: ' + member.displayName);
			bot.channels.get(servers.main.channels.staff).send('Banned: ' + member.displayName);
			// Delete the welcome message
			let meebot = bot.users.get('159985870458322944');
			if (meebot) setTimeout(() => {
				if (meebot.lastMessage && meebot.lastMessage.deletable) meebot.lastMessage.delete();
			}, 500);
		});
	}
});

process.on('unhandledRejection', (err) => {
	stackTrace = (err && err.stack) ? err.stack : err;
	bot.destroy();
});

/* LOGIN */
bot.login(auth.token);
// bot.login(auth.token).then(() => {throw new Error()});