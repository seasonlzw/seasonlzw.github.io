// 这是一个演示代码
print("你好啊");
let ret = await input();
if (ret.confirm) {
    print(`我知道你输入了：${ret.value}`);
} else {
    print("你取消了输入");
}
exit(0);