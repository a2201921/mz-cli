const axios = require('axios')
const path = require('path')
const fs = require('fs')
const ora = require('ora') // loading
const Inquirer = require('inquirer') // 命令行选择
const { promisify } = require('util') // 可以把异步api转成promise

const MetalSmith = require('metalsmith') // 遍历文件夹 找需不需要渲染

let { render } = require('consolidate').ejs; // 统一所有模板引擎
render = promisify(render)

let downloadGitReop = require('download-git-repo') // 下载git模板
downloadGitReop = promisify(downloadGitReop)


let ncp = require('ncp') // 拷贝模板
ncp = promisify(ncp)

const { downloadDirectory } = require('./constants')


// create的所有逻辑
// create功能使创建
// 拉取你自己的所有项目列出来 让用户选 安装那个项目 ProjectName
// 选完后 再显示所有的版本号 1.0

// https://api.github.com/orgs/zhu-cli/repos 获取组织下的仓库

// 可能还需要用户配置一些数据,来结合渲染我的项目



// 1) 获取项目列表
const fetchRepoList = async () => {
    const { data } = await axios({
        url: 'https://api.github.com/orgs/zhu-cli/repos'
    })
    return data
}

// 抓取tag
// 获取对应的版本号https://api.github.com/repos/zhu-cli/vue-simple-template/tags
const fetchTagList = async (repo) => {
    const { data } = await axios({
        url: `https://api.github.com/repos/zhu-cli/${repo}/tags`
    })
    return data
}

// 封装loading效果
const waitLoaidng = (fn, message) => async (...args) => {
    const spinner = ora(message)
    spinner.start()
    const result = await fn(...args)
    spinner.succeed()
    return result
}

// 下载模板
const download = async (repo, tag) => {
    let api = `zhu-cli/${repo}`
    if (tag) {
        api += `#${tag}`
    }
    // /use/xxxx/.template/
    let dest = `${downloadDirectory}/${repo}`
    await downloadGitReop(api, dest)
    return dest
}


module.exports = async (projectName) => {
    // 1)  获取项目的所有模板
    // 等待显示loading
    let repos = await waitLoaidng(fetchRepoList, 'fetching template ...')()

    repos = repos.map(item => item.name)

    let { repo } = await Inquirer.prompt({
        name: 'repo', // 获取选择后的结果
        type: 'list',
        message: 'please choise a template to create project',
        choices: repos
    })

    // 2) 通过当前选择的项目 拉取对应的版本
    let tags = await waitLoaidng(fetchTagList, 'fetching tag ...')(repo)
    tags = tags.map(item => item.name)

    const { tag } = await Inquirer.prompt({
        name: 'tag',
        type: 'list',
        message: 'please choise tags to create project',
        choices: tags
    })

    // 3) 下载git模板到本地
    const result = await waitLoaidng(download, 'download template ...')(repo, tag)

    // 4) 拷贝模板到当前目录
    // 判断是否有ask.json 文件 有就是复杂模板,我们需要用户选择,选择后编译模板, 否则直接拷贝就可以
    if (!fs.existsSync(path.join(result, 'ask.json'))) {
        ncp(result, path.resolve(projectName))
    } else {
        // 1) 让用户填信息
        await new Promise((resolve, reject) => {
            MetalSmith(__dirname).source(result).destination(path.resolve(projectName)).
                use(async (files, metal, done) => {
                    const args = require(path.join(result, 'ask.json'))
                    let obj = await Inquirer.prompt(args)
                    let meta = metal.metadata()  // metal存储信息
                    Object.assign(meta, obj)
                    delete files['ask.json']; // 删除文件
                    done()
                }).
                use((files, metal, done) => {
                    const obj = metal.metadata()
                    Reflect.ownKeys(files).forEach(async (file) => {
                        // 这个是要处理的 <%
                        if (file.includes('js') || file.includes('json')) {
                            let content = files[file].contents.toString() // 文件的内容
                            if (content.includes('<%')) {
                                content = await render(content, obj)  // 结果是字符串
                                files[file].contents = Buffer.from(content) // 字符串转Buffer
                            }
                        }
                    })
                    done()
                })
                .build(err => {
                    if (err) {
                        reject()
                    } else {
                        resolve()
                    }
                })
        })


        // 2) 根据用户填写信息去渲染模板
    }


    // metalsmith 只要需要模板编译
}