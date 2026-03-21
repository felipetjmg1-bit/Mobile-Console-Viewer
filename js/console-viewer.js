/**
 * Mobile Console Viewer - 手机端调试工具
 * 作者: wangweihanNB
 * 版本: 1.0.0
 * 功能: 捕获所有console日志并在手机端显示
 */

(function() {
    'use strict';
    
    // ==================== 配置 ====================
    const CONFIG = {
        maxLogs: 500,           // 最大日志数量
        autoScroll: true,       // 自动滚动到底部
        enableTimeStamp: true,  // 显示时间戳
        theme: 'dark'           // 主题
    };
    
    // ==================== 全局变量 ====================
    let logs = [];              // 存储所有日志
    let currentFilter = 'all'; // 当前过滤类型
    let isPanelCollapsed = false;
    
    // DOM 元素
    let logsContainer;
    let logCountSpan;
    let consolePanel;
    let filterMenu;
    
    // 保存原始的console方法
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };
    
    // ==================== 工具函数 ====================
    
    /**
     * 获取当前时间字符串
     */
    function getTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`;
    }
    
    /**
     * 格式化参数（处理对象、数组、函数等）
     */
    function formatArg(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        
        if (typeof arg === 'function') {
            return `[Function: ${arg.name || 'anonymous'}]`;
        }
        
        if (typeof arg === 'object') {
            try {
                // 处理DOM元素
                if (arg instanceof HTMLElement) {
                    return `<${arg.tagName.toLowerCase()}${arg.id ? ' id="' + arg.id + '"' : ''}>`;
                }
                return JSON.stringify(arg, null, 2);
            } catch(e) {
                return String(arg);
            }
        }
        
        return String(arg);
    }
    
    /**
     * HTML转义防止XSS攻击
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 更新日志计数显示
     */
    function updateLogCount() {
        if (logCountSpan) {
            const filteredCount = currentFilter === 'all' 
                ? logs.length 
                : logs.filter(log => log.type === currentFilter).length;
            logCountSpan.textContent = filteredCount;
        }
    }
    
    /**
     * 渲染所有日志（用于过滤）
     */
    function renderLogs() {
        if (!logsContainer) return;
        
        const filteredLogs = currentFilter === 'all' 
            ? logs 
            : logs.filter(log => log.type === currentFilter);
        
        if (filteredLogs.length === 0) {
            logsContainer.innerHTML = '<div class="empty-state">✨ 暂无日志<br>点击上方按钮测试，所有console输出都会显示在这里</div>';
            updateLogCount();
            return;
        }
        
        let html = '';
        filteredLogs.forEach(log => {
            html += `
                <div class="log-entry ${log.type}">
                    ${CONFIG.enableTimeStamp ? `<div class="log-time">${log.time}</div>` : ''}
                    <div>
                        <span class="log-type ${log.type}">${log.type.toUpperCase()}</span>
                        <span class="log-message">${escapeHtml(log.message)}</span>
                    </div>
                </div>
            `;
        });
        
        logsContainer.innerHTML = html;
        updateLogCount();
        
        // 自动滚动到底部
        if (CONFIG.autoScroll) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }
    }
    
    /**
     * 添加日志到界面
     */
    function addLogToUI(type, args) {
        const time = getTime();
        const message = args.map(arg => formatArg(arg)).join(' ');
        
        // 存储日志
        logs.push({ type, message, time });
        
        // 限制日志数量
        if (logs.length > CONFIG.maxLogs) {
            logs.shift();
        }
        
        // 重新渲染（如果过滤条件匹配）
        if (currentFilter === 'all' || currentFilter === type) {
            renderLogs();
        } else {
            updateLogCount();
        }
    }
    
    // ==================== 重写Console方法 ====================
    
    console.log = function(...args) {
        originalConsole.log.apply(console, args);
        addLogToUI('log', args);
    };
    
    console.error = function(...args) {
        originalConsole.error.apply(console, args);
        addLogToUI('error', args);
    };
    
    console.warn = function(...args) {
        originalConsole.warn.apply(console, args);
        addLogToUI('warn', args);
    };
    
    console.info = function(...args) {
        originalConsole.info.apply(console, args);
        addLogToUI('info', args);
    };
    
    // ==================== 公共方法 ====================
    
    /**
     * 清空所有日志
     */
    window.clearLogs = function() {
        logs = [];
        renderLogs();
        originalConsole.log('✅ 控制台已清空');
    };
    
    /**
     * 导出日志为文件
     */
    window.exportLogs = function() {
        if (logs.length === 0) {
            alert('暂无日志可导出');
            return;
        }
        
        const exportData = logs.map(log => {
            return `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`;
        }).join('\n');
        
        const header = `Mobile Console Viewer 日志导出\n导出时间: ${new Date().toLocaleString()}\n日志数量: ${logs.length}\n${'='.repeat(50)}\n\n`;
        const fullData = header + exportData;
        
        const blob = new Blob([fullData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-logs-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        originalConsole.log(`📎 已导出 ${logs.length} 条日志`);
    };
    
    /**
     * 设置过滤类型
     */
    window.setFilter = function(type) {
        currentFilter = type;
        
        // 更新按钮样式
        const filterBtns = document.querySelectorAll('.filter-menu button');
        filterBtns.forEach(btn => {
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        renderLogs();
        originalConsole.log(`🔍 过滤模式: ${type === 'all' ? '显示全部' : type.toUpperCase()}`);
    };
    
    /**
     * 切换面板展开/收起
     */
    window.togglePanel = function() {
        if (consolePanel) {
            consolePanel.classList.toggle('collapsed');
            isPanelCollapsed = !isPanelCollapsed;
        }
    };
    
    /**
     * 显示/隐藏过滤菜单
     */
    window.toggleFilterMenu = function() {
        if (filterMenu) {
            filterMenu.style.display = filterMenu.style.display === 'none' ? 'flex' : 'none';
        }
    };
    
    // ==================== 测试函数 ====================
    
    window.testLog = function() {
        console.log('这是一条普通日志', '可以带多个参数', 123, true);
    };
    
    window.testError = function() {
        console.error('这是一个错误日志', new Error('出错了！'));
    };
    
    window.testWarn = function() {
        console.warn('这是一个警告', '请检查配置');
    };
    
    window.testInfo = function() {
        console.info('这是一条信息', '当前时间:', new Date().toLocaleString());
    };
    
    window.testObject = function() {
        const user = {
            name: 'wangweihanNB',
            age: 12,
            skills: ['JavaScript', 'HTML', 'CSS', 'Python'],
            github: 'https://github.com/wangweihanNB',
            isDeveloperProgram: true
        };
        console.log('用户信息:', user);
    };
    
    window.testArray = function() {
        const frameworks = ['React', 'Vue', 'Angular', '原生JS', 'Svelte'];
        console.log('前端框架列表:', frameworks);
    };
    
    window.testMultiple = function() {
        console.log('多个参数示例:', '字符串', 42, { key: 'value' }, [1, 2, 3], true);
    };
    
    window.testPerformance = function() {
        console.time('性能测试');
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += i;
        }
        console.timeEnd('性能测试');
        console.log('计算结果:', sum);
    };
    
    // ==================== 初始化 ====================
    
    /**
     * 绑定DOM事件
     */
    function bindEvents() {
        // 测试按钮
        document.getElementById('testLog')?.addEventListener('click', window.testLog);
        document.getElementById('testError')?.addEventListener('click', window.testError);
        document.getElementById('testWarn')?.addEventListener('click', window.testWarn);
        document.getElementById('testInfo')?.addEventListener('click', window.testInfo);
        document.getElementById('testObject')?.addEventListener('click', window.testObject);
        document.getElementById('testArray')?.addEventListener('click', window.testArray);
        document.getElementById('testMultiple')?.addEventListener('click', window.testMultiple);
        document.getElementById('testPerformance')?.addEventListener('click', window.testPerformance);
        
        // 控制按钮
        document.getElementById('clearBtn')?.addEventListener('click', () => window.clearLogs());
        document.getElementById('exportBtn')?.addEventListener('click', () => window.exportLogs());
        document.getElementById('filterBtn')?.addEventListener('click', () => window.toggleFilterMenu());
        
        // 面板折叠
        document.getElementById('consoleHeader')?.addEventListener('click', (e) => {
            // 防止点击按钮时也触发折叠
            if (!e.target.closest('.console-controls')) {
                window.togglePanel();
            }
        });
        
        // 过滤菜单按钮
        const filterBtns = document.querySelectorAll('.filter-menu button');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                window.setFilter(type);
                filterMenu.style.display = 'none';
            });
        });
        
        // 点击其他地方关闭过滤菜单
        document.addEventListener('click', (e) => {
            if (filterMenu && filterMenu.style.display === 'flex') {
                if (!e.target.closest('#filterBtn') && !e.target.closest('.filter-menu')) {
                    filterMenu.style.display = 'none';
                }
            }
        });
    }
    
    /**
     * 初始化页面
     */
    function init() {
        // 获取DOM元素
        logsContainer = document.getElementById('consoleLogs');
        logCountSpan = document.getElementById('logCount');
        consolePanel = document.getElementById('consolePanel');
        filterMenu = document.getElementById('filterMenu');
        
        // 绑定事件
        bindEvents();
        
        // 显示启动信息
        setTimeout(() => {
            console.log('✅ Mobile Console Viewer v1.0.0 已启动！');
            console.log('💡 作者: wangweihanNB | GitHub Developer Program Member');
            console.log('📱 所有 console.log/error/warn/info 都会被捕获');
            console.log('🎨 点击下方控制台标题栏可以收起/展开');
            console.log('🔍 点击过滤按钮可以按类型查看日志');
            console.log('💪 点击上方按钮体验日志捕获功能！');
            
            // 显示设备信息
            console.log('📱 设备信息:', {
                userAgent: navigator.userAgent,
                screenSize: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
                platform: navigator.platform
            });
        }, 100);
        
        // 捕获未处理的错误
        window.addEventListener('error', (event) => {
            console.error('捕获到未处理的错误:', event.message, 'at', event.filename, 'line', event.lineno);
        });
        
        // 捕获Promise未处理的rejection
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise rejection:', event.reason);
        });
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
