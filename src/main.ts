import {
	Modal,
	Plugin,
    addIcon,
    WorkspaceLeaf,
    normalizePath,
} from 'obsidian';

import {saveLog} from './errorLog';

import {QuizSelectMenu} from './quizSelectMenu';
import {QuizTab,QuizModal} from './windows';
import {appSetting,languageText,appSettingTab} from './settings';

export const TAB_NAME = "quiz-tab";

let quizCreatorUI:Modal;
let quizCreatorTab:QuizTab | void;
let appSettingT:appSettingTab;

let mainWindow:WorkspaceLeaf;

let quizSelectM:QuizSelectMenu;

export let quizcSettings!:appSetting;

export let languageTexts:languageText;

let languageContentJSON:Record<string,languageText>;

export default class QuizCreator extends Plugin {
	settings!:appSetting;
    
	async onload() {
		await this.loadSettings();

        addIcon('quizc-icon',`<svg viewBox="0 0 240 240">
                            <rect id="shape0" transform="translate(8.83199948186008, 8.09085051306265)" fill="none" stroke="currentColor" stroke-width="25" stroke-linecap="square" stroke-linejoin="bevel" width="220.173590584303" height="127.509149486937"></rect><rect id="shape01" transform="translate(4.17561130196121, 170.014089028183)" fill="currentColor" stroke="currentColor" stroke-width="9.6" stroke-linecap="square" stroke-linejoin="bevel" width="229.884585558085" height="7"></rect><rect id="shape02" transform="translate(3.95282258195477, 205)" fill="currentColor" stroke="currentColor" stroke-width="9.6" stroke-linecap="square" stroke-linejoin="bevel" width="229.58997427175" height="7">
                            </svg>
                            `);
        
        

        this.registerView(TAB_NAME,(leaf)=>new QuizTab(leaf));

		this.addRibbonIcon('quizc-icon', 'QuizCreator', async (_evt: MouseEvent) => {
            if(this.settings.externalTab == "true"){
                if(quizCreatorTab && quizCreatorTab.quizCreatorisOpen == true){ 
                    await this.app.workspace.revealLeaf(mainWindow);
                    return;
                }

                mainWindow = this.app.workspace.openPopoutLeaf();

                await mainWindow.setViewState({
                    type: "quiz-tab",
                    active: true,
                });

                if(mainWindow.view instanceof QuizTab)
                    quizCreatorTab = mainWindow.view;
                
                if(quizCreatorTab){
                    quizSelectM = new QuizSelectMenu(quizCreatorTab,null,this);
                    quizSelectM.loadMainMenu();
                    if(appSettingT)
                        appSettingT.setExternalTab(quizCreatorTab);
                }
            }else{
                this.app.workspace.containerEl.focus();

                window.setTimeout(() => {
                    quizCreatorUI = new QuizModal(this.app);
                    quizCreatorUI.open();

                    if(appSettingT)
                        appSettingT.setModal(quizCreatorUI);

                    quizSelectM = new QuizSelectMenu(null,quizCreatorUI,this);
                    quizSelectM.loadMainMenu();
                }, 50);
            }
        });

        appSettingT = new appSettingTab(this.app,this);

        await this.loadLanguageJSON();

        if(!this.settings){
            quizcSettings = appSettingT.defaultSetting;
            this.settings = quizcSettings;
            this.saveSettings();
        }else{
            try{
                const settinJSON:appSetting = this.settings;
                quizcSettings ={
                            selectQuestionButtonWidth  :settinJSON.selectQuestionButtonWidth,
                            nextResetExitButtonWidth   :settinJSON.nextResetExitButtonWidth,
                            selectQuestionElementMargin:settinJSON.selectQuestionElementMargin,
                            correctColor               :settinJSON.correctColor,
                            wrongColor                 :settinJSON.wrongColor,
                            quizMenuElementWidth       :settinJSON.quizMenuElementWidth,
                            quizMenuElementMargin      :settinJSON.quizMenuElementMargin,
                            language                   :this.loadLanguage(settinJSON.language),
                            externalTab                :settinJSON.externalTab
                };
            }catch(e){
                saveLog(this,e);
                quizcSettings = appSettingT.defaultSetting;
                this.settings = quizcSettings;
                this.saveSettings();
            }
        }
        this.loadSettings();

        appSettingT.addSetting(quizcSettings);

		this.addSettingTab(appSettingT);
        
        appSettingT.applySettings();
	}

    async createLanguageJSON(){
        const pluginDir = this.manifest.dir;
        const normalizedPath = normalizePath(pluginDir+"/languages.json");
        const languageText = "{\n"+
                                "\t\"tr\":{\n"+
                                    "\t\t\"nextButton\":\"Sonraki\",\n"+
                                    "\t\t\"exitButton\":\"Çık\",\n"+
                                    "\t\t\"reloadButton\":\"Tekrarla\",\n"+
                                    "\t\t\"selectQuizText\":\"Quiz Seç\",\n"+
                                    "\t\t\"resulText\":\"Sonuç\",\n"+
                                    "\t\t\"correctText\":\"Doğru\",\n"+
                                    "\t\t\"wrongText\":\"Yanlış\",\n"+
                                    "\t\t\"emptyText\":\"Boş\"\n"+
                                
                                "\t},\n"+
                                "\t\"en\":{\n"+
                                    "\t\t\"nextButton\":\"Next\",\n"+
                                    "\t\t\"exitButton\":\"Exit\",\n"+
                                    "\t\t\"reloadButton\":\"Reload\",\n"+
                                    "\t\t\"selectQuizText\":\"Select Quiz\",\n"+
                                    "\t\t\"resulText\":\"Result\",\n"+
                                    "\t\t\"correctText\":\"Correct\",\n"+
                                    "\t\t\"wrongText\":\"Wrong\",\n"+
                                    "\t\t\"emptyText\":\"Empty\"\n"+
                                "\t}\n"+
                            "}\n"; 
        await this.app.vault.adapter.write(normalizedPath,languageText);
        languageContentJSON = JSON.parse(languageText);
    }

    async loadLanguageJSON(){
        try{
            const pluginDir = this.manifest.dir;

            if(!pluginDir) return;

            const normalizedPath = normalizePath(pluginDir+"/languages.json");
            if(await this.app.vault.adapter.exists(normalizedPath)){
                const content = await this.app.vault.adapter.read(normalizedPath);
                languageContentJSON = JSON.parse(content);
            }else{
                this.createLanguageJSON();
            }
        }catch(e){
            saveLog(this,e);
            this.createLanguageJSON();
        }
    }

    loadLanguage(language:string):string{
        try{
            if(language in languageContentJSON){
                const selectedL = languageContentJSON[language]!;
                languageTexts = {
                    nextButton: selectedL.nextButton,
                    exitButton: selectedL.exitButton,
                    reloadButton:selectedL.reloadButton,
                    selectQuizText: selectedL.selectQuizText,
                    resulText: selectedL.resulText,
                    correctText: selectedL.correctText,
                    wrongText: selectedL.wrongText,
                    emptyText: selectedL.emptyText
                };
                return language;           
            }else{
                languageTexts = {
                    nextButton:"Next",
                    exitButton:"Exit",
                    reloadButton:"Reload",
                    selectQuizText:"Select Quiz",
                    resulText:"Result",
                    correctText:"Correct",
                    wrongText:"Wrong",
                    emptyText:"Empty"
                };
                return "en";
            }
        }catch(e){
            saveLog(this,e);
            languageTexts = {
                nextButton:"Next",
                exitButton:"Exit",
                reloadButton:"Reload",
                selectQuizText:"Select Quiz",
                resulText:"Result",
                correctText:"Correct",
                wrongText:"Wrong",
                emptyText:"Empty"
            };
            return "en";
        }
    }

	async loadSettings() {
		this.settings = await this.loadData();
	}

	async saveSettings() {
		await this.saveData(this.settings);
        this.loadLanguage(this.settings.language);
	}
}
