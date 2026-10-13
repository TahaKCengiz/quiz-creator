import { normalizePath, Plugin} from "obsidian";

export async function saveLog(plugin:Plugin,error:Error|unknown){
    const pluginDir = plugin.manifest.dir;
    const normalizedPath = normalizePath(pluginDir+"/errorLog.txt");

    const exists = await plugin.app.vault.adapter.exists(normalizedPath);

    if(!exists){
        await plugin.app.vault.adapter.write(
            normalizedPath,
            ""
        );
    }

    const oldContent = await plugin.app.vault.adapter.read(normalizedPath);

    if(error instanceof Error){
        let errorLog = "";
        if(error.message)
            errorLog+="Error: "+error.message;
        if(error.stack)
            errorLog+="\nStack: "+error.stack;
        if(errorLog != ""){
            await plugin.app.vault.adapter.write(
                normalizedPath,
                oldContent + errorLog + "\n\n"
            );
        }
    }
}