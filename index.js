'use strict';

const fs = require('fs')
const path = require('path')
const CRC32 = require('crc-32')

/**
 * 
 * @param {String} src 需要检查的文件夹，相对于cwd
 * @param {String} configName 配置文件名，位置在cwd下，默认值为unfat.conf.json
 */
function check(src, configName = 'unfat.conf.json'){
    //获取配置文件
    let config
    // let cwd = process.cwd()
    let configPath = path.resolve(configName)
    if(fs.existsSync(configPath)){
        let cnf = fs.readFileSync(configPath, 'utf8')
        config = JSON.parse(cnf)
    }else {
        //没有就创建一个
        /*
        config: {
            'demo/file.js': {
                crc: '00000000',
                flag: 'NEW'|'UPDATE'|'OLD'|'DELETE'
            },
            ...
        }*/
        config = {}
    }

    //获取src内的所有文件并计算crc32
    let targets = getCRC32(src)
    //清理已删除文件的数据
    let configKeys = Object.keys(config)
    for(let k of configKeys) {
        let file = config[k]
        //配置文件中有，本地没有，第一次标志为删除，第二次删除配置中的数据
        if(!targets[k]) {
            if(file.flag === 'DELETE') {
                delete config[k]
            }else {
                file.flag = 'DELETE'
            }
        }
    }

    //对比文件与配置的crc
    for(let k in targets) {
        let file = config[k]
        let crc = targets[k]
        if(file) {
            if(file.crc !== crc) {
                //更新
                file.crc = crc
                file.flag = 'UPDATE'
            }else {
                //没变化
                file.flag = 'OLD'
            }
        }else {
            //新增
            config[k] = {
                crc: crc,
                flag: 'NEW'
            }
        }
    }

    //输出配置文件到工作目录
    fs.writeFile(path.resolve(configName), JSON.stringify(config, null, 2))
}

/**
 * 获取src指定目录下的所有文件名和crc32
 * @param {String} src 相对当前工作目录的文件目录名
 */
function getCRC32(src) {
    let targets = Object.create(null)
    function getFiles(dir, prefix) {
        let files = fs.readdirSync(dir)
        for(let f of files) {
            let fpath = path.resolve(dir, f)
            let stat = fs.statSync(fpath)
            let fileName = prefix ? `${prefix}/${f}` : f

            if(stat.isFile()) {
                let buf = fs.readFileSync(fpath)
                let crc = CRC32.buf(buf)
                targets[fileName] = (crc >>> 0).toString(16)
            }else if(stat.isDirectory()){
                getFiles(fpath, fileName)
            }
        }
    }

    let absoluteSrc = path.resolve(src)
    if(fs.existsSync(absoluteSrc)) {
        let srcStat = fs.statSync(absoluteSrc)
        if(srcStat.isDirectory) {
            getFiles(absoluteSrc, '')
        }else {
            throw new Error(`${absoluteSrc} is not a directiory!`)
        }
    }else {
        throw new Error(`${absoluteSrc} not exist!`)
    }

    return targets
}

module.exports.check = check