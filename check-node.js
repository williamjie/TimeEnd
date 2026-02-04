// Node.js 环境检测脚本
console.log('正在检测 Node.js 环境...\n');

try {
    const nodeVersion = process.version;
    console.log('✅ Node.js 已安装');
    console.log(`   版本: ${nodeVersion}\n`);
    
    // 检查 npm
    const { execSync } = require('child_process');
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
        console.log('✅ npm 已安装');
        console.log(`   版本: ${npmVersion}\n`);
        
        console.log('✅ 环境检查通过！可以运行 npm install 安装依赖。');
    } catch (error) {
        console.log('❌ npm 未找到，但 Node.js 已安装');
        console.log('   请检查 Node.js 安装是否完整。');
    }
} catch (error) {
    console.log('❌ Node.js 未安装或未添加到 PATH');
    console.log('\n请按照以下步骤操作：');
    console.log('1. 访问 https://nodejs.org/ 下载 Node.js');
    console.log('2. 安装时确保勾选 "Add to PATH" 选项');
    console.log('3. 安装完成后重启终端或计算机');
    console.log('4. 再次运行此脚本检查');
}
