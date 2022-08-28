BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS `youtube_links` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`link`	TEXT NOT NULL,
	`category`	TEXT NOT NULL,
	`comment`	TEXT,
	`submitter`	TEXT,
	`approved`	INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS `tl_tags` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`url`	TEXT NOT NULL UNIQUE,
	`tags`	TEXT,
	`disabled`	INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS `text_data` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`modulename`	TEXT NOT NULL DEFAULT 'slb',
	`name`	TEXT NOT NULL,
	`value`	TEXT
);
CREATE TABLE IF NOT EXISTS `suggestions` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`submitter`	TEXT NOT NULL,
	`sug_text`	TEXT NOT NULL,
	`category`	TEXT DEFAULT 'unsorted',
	`status`	TEXT NOT NULL DEFAULT 'NEW',
	`prio`	INTEGER NOT NULL DEFAULT 10,
	`comment`	TEXT
);
CREATE TABLE IF NOT EXISTS `redlist` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`command`	TEXT NOT NULL,
	`channel`	TEXT NOT NULL,
	`context`	TEXT,
	`issued_by`	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS `raidreg` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`nick`	TEXT NOT NULL UNIQUE,
	`channelname`	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS `pogchamp` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`date`	TEXT UNIQUE,
	`emote`	TEXT,
	`source`	TEXT,
	`comment`	TEXT
);
CREATE TABLE IF NOT EXISTS `numeric_data` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`modulename`	TEXT NOT NULL,
	`name`	TEXT NOT NULL,
	`value`	INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS `nft` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`uid`	TEXT NOT NULL UNIQUE,
	`title`	TEXT,
	`link`	TEXT,
	`thumbnail`	TEXT,
	`desc`	TEXT
);
CREATE TABLE IF NOT EXISTS `help` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`command`	TEXT UNIQUE,
	`desc`	TEXT,
	`exthelp`	TEXT DEFAULT ' '
);
CREATE TABLE IF NOT EXISTS `greenlist` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`command`	TEXT NOT NULL,
	`channel`	TEXT NOT NULL,
	`context`	TEXT,
	`issued_by`	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS `grants` (
	`id`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`channel`	TEXT,
	`context`	TEXT,
	`unick`	TEXT
);
CREATE TABLE IF NOT EXISTS `feeds` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`name`	TEXT UNIQUE,
	`description`	TEXT,
	`url`	TEXT,
	`addedby`	TEXT DEFAULT 'default',
	`approved`	INTEGER DEFAULT 0,
	`category`	TEXT NOT NULL DEFAULT 'generic'
);
CREATE TABLE IF NOT EXISTS `channels` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`name`	TEXT NOT NULL UNIQUE,
	`chmode`	TEXT NOT NULL DEFAULT '0',
	`debug_join`	INTEGER DEFAULT 0,
	`bpapi_url`	NUMERIC DEFAULT 'none',
	`monitor`	INTEGER DEFAULT 0,
	`ps_online_message`	TEXT DEFAULT 'none',
	`ps_offline_message`	TEXT DEFAULT 'none',
	`chpoint`	INTEGER DEFAULT 0,
	`sr`	TEXT DEFAULT 'disabled',
	`chid`	INTEGER,
	`context`	TEXT NOT NULL DEFAULT 'twitch',
	`links`	INTEGER DEFAULT 1,
	`monitorbans`	INTEGER DEFAULT 1,
	`broadcastOnline`	INTEGER DEFAULT 0,
	`offlineOnly`	INTEGER DEFAULT 0,
	`pajbot2`	TEXT DEFAULT 'none'
);
CREATE TABLE IF NOT EXISTS `bans` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`username`	TEXT NOT NULL,
	`command`	TEXT NOT NULL,
	`issued-by`	TEXT NOT NULL,
	`data`	TEXT
);
CREATE TABLE IF NOT EXISTS `auth` (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`keyname`	TEXT NOT NULL UNIQUE,
	`data`	TEXT NOT NULL,
	`type`	TEXT NOT NULL,
	`expires`	INTEGER
);
COMMIT;
