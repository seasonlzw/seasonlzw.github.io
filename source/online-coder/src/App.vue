<template>
    <div id="app">
        <vue-draggable-resizable :w="splitePosition"
            :x="0"
            :y="0"
            :min-width="constants.MIN_SPLITE_SIZE"
            :parent="true"
            class-name="splite-box"
            :onResize="onResizeConfirm"
            @resizing="onResize"
            :active="true"
            :prevent-deactivation="true"
            :draggable="false"
            :resizable="true"
            :handles="['mr']"
            class-name-handle="splite-handle">
            <run-panel ref="processor" />
        </vue-draggable-resizable>
        <edit-panel @submit="onCodeSubmit" />
    </div>
</template>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0px;
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;
    border-width: 0px;
    background: linear-gradient(to top, #eee 57%,#fff 90%,#fff 100%) !important;
}

.splite-box {
    border-width: 0px;
    padding: 0px 10px 0px 0px;
    height: auto !important;
}

.splite-handle {
    position: absolute;
    background: linear-gradient(45deg, #ccc 50%, #fff 0); 
    background-size: 4px 4px;
    border: 1px solid #ccc;
    border-radius: 4px;
    height: 57px;
    width: 10px;
}

.splite-handle-mr {
    top: 50%;
    margin-top: 0px;
    right: 0px;
    cursor: e-resize;
}
</style>

<script>
import VueDraggableResizable from 'vue-draggable-resizable';
import editPanel from "./components/editPanel";
import runPanel from "./components/runPanel";

const dbKey = "inline-coder-local-param";
const minSpliteSize = 260;

export default {
    name: 'App',
    components: {
        VueDraggableResizable,
        editPanel,
        runPanel
    },
    data () {
        return {
            constants: Object.freeze({MIN_SPLITE_SIZE: minSpliteSize}),
            splitePosition: minSpliteSize,
            localParam: {}
        }
    },
    methods: {
        onResize (x, y, width, height) {
            // 分割器调整了大小，调整对应的尺寸参数，并保存到本地缓冲中去
            this.splitePosition = width;
            this.localParam.splitePosition = width;
            localStorage.setItem(dbKey, JSON.stringify(this.localParam));
        },
        onResizeConfirm (_handler, _x, _y, _width, _height) {
            // 如果分割器调整大小的时候，给右侧保留的空间太小，则
            return (screen.availWidth - _width > minSpliteSize);
        },
        onCodeSubmit (_code) {
            // 代码已提交运行
            this.$refs.processor.runCode(_code);
        }
    },
    mounted () {
        // 加载本地缓存的运行参数
        this.localParam = JSON.parse(localStorage.getItem(dbKey)) || {};
        if (undefined === this.localParam.splitePosition) {
            this.localParam.splitePosition = document.body.clientWidth / 2 - 5;
        }
        this.splitePosition = this.localParam.splitePosition;
    }
}
</script>
