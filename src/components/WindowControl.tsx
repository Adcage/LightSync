import { VscChromeClose, VscChromeMinimize, VscChromeMaximize, VscChromeRestore } from 'react-icons/vsc';
import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@nextui-org/react';

export default function WindowControl() {
    const [isMax, setIsMax] = useState(false);
    const [osType, setOsType] = useState<string>('');

    useEffect(() => {
        const appWindow = getCurrentWindow();
        
        // 获取操作系统类型
        const getOsType = async () => {
            try {
                // 使用 Tauri 命令获取环境信息
                const { invoke } = await import('@tauri-apps/api/core');
                const os = await invoke('get_environment_mode');
                setOsType(os as string);
            } catch (error) {
                console.error('获取操作系统类型失败:', error);
                setOsType('unknown');
            }
        };

        getOsType();

        // 监听窗口最大化状态变化
        const unlisten = listen('tauri://resize', async () => {
            if (await appWindow.isMaximized()) {
                setIsMax(true);
            } else {
                setIsMax(false);
            }
        });

        return () => {
            unlisten.then(fn => fn());
        };
    }, []);

    const appWindow = getCurrentWindow();

    return (
        <div className="window-control flex h-full">
            <Button
                isIconOnly
                variant='light'
                className='w-[35px] h-[35px] rounded-none'
                onPress={() => appWindow.minimize()}
            >
                <VscChromeMinimize className='text-[16px]' />
            </Button>
            <Button
                isIconOnly
                variant='light'
                className='w-[35px] h-[35px] rounded-none'
                onPress={() => {
                    if (isMax) {
                        appWindow.unmaximize();
                    } else {
                        appWindow.maximize();
                    }
                }}
            >
                {isMax ? <VscChromeRestore className='text-[16px]' /> : <VscChromeMaximize className='text-[16px]' />}
            </Button>
            <Button
                isIconOnly
                variant='light'
                className={`w-[35px] h-[35px] rounded-none close-button ${osType === 'Linux' ? 'rounded-tr-[10px]' : ''}`}
                onPress={() => appWindow.close()}
            >
                <VscChromeClose className='text-[16px]' />
            </Button>
        </div>
    );
}