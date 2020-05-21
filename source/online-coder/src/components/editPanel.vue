<template>
    <div class="container-box">
        <div class="tool-bar">
            源代码：
            <a-button-group class="tool-group">
                <a-button icon="file" @click="onNew">新建</a-button>
                <a-button icon="folder-open" @click="onOpen">打开</a-button>
                <a-button icon="save" @click="onSave">保存</a-button>
            </a-button-group>
            <a-button-group class="tool-group">
                <a-button icon="undo" @click="onUndo">撤销</a-button>
                <a-button icon="redo" @click="onRedo">重做</a-button>
            </a-button-group>
            <a-button-group class="tool-group">
                <a-button icon="file-search" @click="onSearch">查找</a-button>
                <a-button icon="file-sync" @click="onReplace">替换</a-button>
            </a-button-group>
            <a-button-group class="tool-group">
                <a-button icon="play-square" @click="onRun">运行</a-button>
            </a-button-group>
        </div>
        <textarea ref="codeEditor" class="code-editor" />
    </div>
</template>

<style>
@import url("../assets/globalStyle.css");

.container-box {
    border-width: 0px; 
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}
.code-editor {
    text-align: left;
    width: 100%;
    height: 100%;
    border-width: 0px;
    outline: none;
    flex-grow: 1;
}
.CodeMirror {
    border-width: 0px;
    height: 100%;
}

.CodeMirror-scroll {
    height: 100%;
    overflow-y: hidden;
    overflow-x: auto;
}

.CodeMirror-sizer {
    min-height: 0px !important;
    margin-bottom: 0px !important;
}

@import url('../assets/editorTheme.css');

</style>

<script>
import CodeMirror from 'codemirror/lib/codemirror'
import "codemirror/lib/codemirror.css";

import "codemirror/mode/javascript/javascript";

import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/indent-fold";
import "codemirror/addon/fold/xml-fold";

import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/javascript-hint";

import "codemirror/addon/dialog/dialog.css";
import "codemirror/addon/search/matchesonscrollbar.css";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/search/searchcursor";
import "codemirror/addon/search/search";
import "codemirror/addon/scroll/annotatescrollbar";
import "codemirror/addon/search/matchesonscrollbar";
import "codemirror/addon/search/jump-to-line";

export default {
    data () {
        return {
            editor: null
        }
    },
    methods: {
        onNew() {
            this.editor.setValue("");
        },
        onOpen() {
            const inputElement = document.createElement("input");
            inputElement.type = "file";
            inputElement.addEventListener("change", () => { 
                const files = inputElement.files;
                if (files.length > 0) {
                    let reader = new FileReader();
                    reader.onload = (_event) => {
                        this.editor.setValue(_event.target.result)
                        this.$notification.open({
                            message: "打开文件",
                            description: "文件已打开。\r\n你也可以通过将文件拖放到编辑框中直接打开文件。",
                            placement: "bottomRight",
                        });
                    };
                    reader.readAsText(files[0]);
                }
            });
            return inputElement.click();
        },
        onSave() {
            let data = this.editor.getValue();
            let blob = new Blob([data], {type: "text/javascript"});
            const downloadElement = document.createElement("a");
            downloadElement.href = URL.createObjectURL(blob);
            downloadElement.download = "*.js";
            downloadElement.click();
            URL.revokeObjectURL(downloadElement.href);
        },
        onRedo() {
            this.editor.execCommand("redo");
        },
        onUndo() {
            this.editor.execCommand("undo");
        },
        onRun() {
            let data = this.editor.getValue();
            this.$emit("submit", data);
        },
        onSearch() {
            this.editor.execCommand("find");
        },
        onReplace() {
            this.editor.execCommand("replace");
        },
    },
    mounted () {
        this.editor = CodeMirror.fromTextArea(this.$refs.codeEditor, {
            value: "",
            mode: {
                name: "javascript", 
                globalVars: true
            },
            lineNumbers: true,
            tabSize: 4,
            indentUnit: 4,
            autofocus: true,
            theme: "seasonStyle",
            extraKeys: {
                "Ctrl-Q": _editor => _editor.foldCode(_editor.getCursor()), 
                "Ctrl-Space": "autocomplete",
                "Ctrl-S": () => this.onSave(),
                "F5": () => this.onRun(),
                "F3": "findPersistent"
            },
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        });
        let codePath = location.href;
        let codeIndex = codePath.indexOf("?");
        codePath = ((codeIndex < 0) || (codeIndex >= codePath.length - 1)) ? "demo.js" : codePath.substring(codeIndex + 1);
        fetch(`./js/${codePath}`).then(
            _response => {
                return (_response.ok && (_response.headers.get("Content-Type").indexOf("javascript") >= 0)) ? _response.text() : `// 无法加载代码文件 "${codePath}" `;
            }
        ).then(
            _text => this.editor.setValue(_text)
        );
    }
}
</script>