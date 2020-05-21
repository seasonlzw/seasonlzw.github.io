<template>
    <div class="run-panel">
        <div class="tool-bar">
            执行窗口：
            <a-button-group class="tool-group">
                <a-button icon="delete" @click="onClean">清空</a-button>
                <a-button icon="close" type="danger" :disabled="worker === undefined" @click="onTerminate">终止</a-button>
            </a-button-group>
        </div>
        <div class="run-output" ref="output">
            <div v-html="result" />
            <a-input v-if="showInput" ref="inputBox" :placeholder="inputTip" :default-value="defaultInputValue" @keydown.enter.stop="onConfirmInput">
                <a-icon slot="addonAfter" type="close" :style="{color: '#f00'}" @click="onCancelInput" />
            </a-input>
        </div>
    </div>
</template>

<style>
@import url("../assets/globalStyle.css");

.run-panel {
    border-width: 0px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.run-output {
    text-align: left;
    width: 100%;
    height: 100%;
    border-width: 0px;
    outline: none;
    flex-grow: 1;
    background-color: #000;
    color: #fff;
    display: flex;
    flex-direction: column;
    text-align: left;
    overflow: scroll;
}

.run-text {
    color: #fff;
}

.run-warn {
    color: #ff0;
}

.run-error {
    color: #f00;
}

.run-comment {
    color: darkgreen;
}

</style>

<script>

import regenerator from "regenerator";

// 交互的消息码
const MSG_CODE = {
    END: -1,
    START: 0,
    CODE: 1,
    LOG: 2,
    WARN: 3,
    ERROR: 4,
    LINENO: 5,
    STATE: 6,
    INPUT: 7
};

// 线程函数
function workerHost(MSG_CODE, global) {
    // 将this转存为self，以避免后续this变更时出错
    const self = this;

    // 线程交互状态
    let interworkState = undefined;

    // 结束整个代码运行
    function exit(_code) {
        self.postMessage({code:MSG_CODE.END, ret:_code});
    }

    // 替代console.log
    function log() {
        self.postMessage({code:MSG_CODE.LOG, data:JSON.stringify(Array.prototype.slice.call(arguments, 0))});
    }

    // 替代console.warn
    function warn() {
        self.postMessage({code:MSG_CODE.WARN, data:JSON.stringify(Array.prototype.slice.call(arguments, 0))});
    }

    // 替代console.error
    function error() {
        self.postMessage({code:MSG_CODE.ERROR, data:JSON.stringify(Array.prototype.slice.call(arguments, 0))});
    }

    // 登记当前行号
    function setDebugLineNumber(_lineNo) {
        self.postMessage({code:MSG_CODE.LINENO, data:_lineNo});
    }

    // 在宿主中反馈异常
    function notifyErrorInHost(_error) {
        throw _error;
    }

    // 返回等待状态有效的Promise
    function waitState(_intervalMS) {
        function checkState(_fn) {
            if (undefined !== interworkState) {
                _fn(interworkState);
            } else {
                setTimeout(checkState, _intervalMS, _fn);
            }
        }

        return new Promise(_resolve => checkState(_resolve));
    }

    // 获取输入
    function input(_tip, _default) {
        interworkState = undefined;
        self.postMessage({code:MSG_CODE.INPUT, tip:_tip, default:_default});
        return waitState(50);
    }

    // 响应从主线程传递来的消息
    this.addEventListener("message", (_event) => {
        const _msg = _event.data;
        switch (_msg.code) {
            case MSG_CODE.CODE:
                // 加载并运行主线程传递来的代码
                (new Function("global", "exit", "console", "print", "input", _msg.data))(
                    self, 
                    exit,
                    {log, warn, error, exit, setDebugLineNumber}, 
                    log,
                    input
                ).catch(_error => {
                    setTimeout(notifyErrorInHost, 0, _error);
                });
                break;

            case MSG_CODE.STATE:
                // 接收主线程传递来的状态
                interworkState = _msg.state;
                break;

            default:
                console.warn("Thread can not process this message:", _msg);
                break;
        }
    });
    self.postMessage({code:MSG_CODE.START});
}

// 准备工作线程宿主资源
function prepareWorkerHostResouce() {
    fetch("./js/regenerator-runtime.js").then(
        _response => _response.text()
    ).then(
        _text => {
            const hostCode = regenerator.compile(workerHost.toString()).code;
            const blob = new Blob([`${_text}; (${hostCode})(${JSON.stringify(MSG_CODE)}, this)`]);
            const url = URL.createObjectURL(blob);
            this.hostBlob = blob;
            this.hostURL = url;
        }
    )
}

// 启动代码
function startCode(_code) {
    clearTimeout(this.timeoutID);
    if (this.hostBlob && this.hostURL) {
        this.terminateWorker();
        this.worker = new Worker(this.hostURL);
        if (this.worker) {
            this.worker.addEventListener("message", (_e) => {
                this.onMessage(_e.data);
            });
            this.worker.addEventListener("error", (_e) => {
                let _errorStr = `【发生错误】行号：${this.runLineNumber}。\n\t\t错误描述：${_e.message}`;
                console.log(_errorStr);
                outputLog.apply({vue:this, type:"error"}, [_errorStr]);
            });
            let lineNo = 2;
            _code = "console.setDebugLineNumber(1);\n" + _code.replace(/\n/ig, () => `\nconsole.setDebugLineNumber(${lineNo++});\n`);
            this.runLineNumber = 0;
            this.postMessage({code: MSG_CODE.CODE, data: regenerator.compile(`return (async function () { ${_code} })()`).code});
        } else {
            this.$message.error("无法启动代码执行任务，本次运行失败！");
        }
    } else {
        this.timeoutID = setTimeout(startCode, 100, _code);
    }
}

// 格式化日志字符串映射表
const logTextMapper = {
    "<": "&lt;",
    ">": "&gt;",
    "\t": "&nbsp;&nbsp;&nbsp;&nbsp;",
    "&": "&amp;",
    '"': "&quot;",
    "\r": " ",
    "\n": "<br />"
}

// 格式化日志字符串
function formatLogText(_type, _text) {
    return `<div class="run-${_type}">${_text.replace(/(<|>|&|"|\\r|\\n|\s)/ig, (_w) => {
        return logTextMapper[_w] || "&nbsp;";
    })}</div>`;
}

// 输出
function outputLog() {
    let _text = "";
    for (let item of arguments) {
        if ("" !== _text) {
            _text += " ";
        }
        if (typeof item === "object") {
            if (null === item) {
                _text += "null";
            } else if (undefined === item) {
                _text += "undefined";
            } else {
                _text += JSON.stringify(item);
            }
        } else {
            _text += item;
        }
    }
    this.vue.result += formatLogText(this.type, _text);
    this.vue.$nextTick(() => {
        const element = this.vue.$refs.output;
        element.scroll({
            top: element.clientHeight, 
            left: 0, 
            behavior: "smooth"
        });
    });
}

// 默认的输入提示
const defInputTip = "请输入内容，并敲击<回车>键";

export default {
    data() {
        return {
            result: "",
            worker: undefined,
            timeoutID: undefined,
            hostBlob: undefined,
            hostURL: undefined,
            runLineNumber: 0,
            showInput: false,
            inputTip: undefined,
            defaultInputValue: ""
        }
    },
    mounted() {
        prepareWorkerHostResouce.call(this);
    },
    methods: {
        onTerminate() {
            // 终止执行的线程
            this.terminateWorker();
        },
        onClean () {
            // 清空之前的运行结果
            this.result = "";
        },
        onMessage(_msg) {
            // 处理执行线程发过来的消息
            switch (_msg.code) {
                case MSG_CODE.START:
                    console.log("Thread is started");
                    break;

                case MSG_CODE.END:
                    console.log(`Code say it is the end. The exit code is (${_msg.ret}). Terminate it!`);
                    this.terminateWorker();
                    break;

                case MSG_CODE.LOG:
                    outputLog.apply({vue: this, type: "text"}, JSON.parse(_msg.data));
                    break;

                case MSG_CODE.WARN:
                    outputLog.apply({vue: this, type: "warn"}, JSON.parse(_msg.data));
                    break;

                case MSG_CODE.ERROR:
                    outputLog.apply({vue: this, type: "error"}, JSON.parse(_msg.data));
                    break;

                case MSG_CODE.LINENO:
                    this.runLineNumber = _msg.data;
                    break;

                case MSG_CODE.INPUT:
                    this.inputTip = _msg.tip || defInputTip;
                    this.defaultInputValue = _msg.default || "";
                    this.showInput = true;
                    this.$nextTick(() => {
                        this.$refs.inputBox.focus();
                    });
                    break;

                default:
                    console.warn("Unknown message:", _msg);
                    break;
            }
        },
        onConfirmInput (_event) {
            // 输入框得到输入了
            this.showInput = false;
            this.postMessage({
                code: MSG_CODE.STATE, 
                state: {
                    confirm: true,
                    value: _event.target.value
                }
            });
        },
        onCancelInput (_event) {
            // 取消输入框输入
            this.showInput = false;
            this.postMessage({
                code: MSG_CODE.STATE, 
                state: {
                    confirm: false,
                    value: undefined
                }
            });
        },
        terminateWorker() {
            // 关闭执行线程
            if (this.worker) {
                this.worker.terminate();
                this.worker = undefined;
                outputLog.call({vue:this, type:"comment"}, "[ 程序已被终止 ]");
            }
            this.showInput = false;
        },
        postMessage(_msg) {
            // 向执行线程投递消息
            if (this.worker) {
                this.worker.postMessage(_msg);
            }
        },
        runCode (_code) {
            // 运行代码
            outputLog.call({vue:this, type:"comment"}, "[ 程序开始执行 ]");
            startCode.call(this, _code);
        }
    }
}
</script>