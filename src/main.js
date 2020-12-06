// 1) 解析用户的参数
const program = require('commander')
const path = require('path')
const { version } = require('./constants.js')

const mapActions = {
    create: {
        alias: 'c',
        description: 'create project',
        examples: [
            'mz-cli create <project-name>'
        ]
    },
    config: {
        alias: 'conf',
        description: 'config project variable',
        examples: [
            'mz-cli config set <k> <v>',
            'mz-cli config get <k> <v>'
        ]

    },
    '*': {
        alias: '',
        description: 'command not found',
        examples: []
    }

}

Reflect.ownKeys(mapActions).forEach((action) => {
    program.command(action) // 配置命令的名字
        .alias(mapActions[action].alias) // 命令的别名
        .description(mapActions[action].description) // 命令对应的描述
        .action(() => {
            if (action === '*') {
                console.log(mapActions[action].description)
            } else {
                require(path.resolve(__dirname, action))(...process.argv.slice(3))
            }
        })
})

// 监听用户的help事件
program.on('--help', () => {
    console.log('\nExamples:')
    Reflect.ownKeys(mapActions).forEach((action) => {
        mapActions[action].examples.forEach(example => {
            console.log(`  ${example}`)
        })
    })
})

program.version(version)  // 配置版本号
program.parse(process.argv)  // 解析命令
