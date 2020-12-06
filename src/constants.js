const { createPromptModule } = require('inquirer');
const path = require('path')
// 存放用户所需要的常量
const { version } = require('../package.json')


// 储存模板的位置
const downloadDirectory = process.env[process.platform === 'darwin' ? 'Home' : 'USERPROFILE']+'/.template';

module.exports = {
    version,
    downloadDirectory
}