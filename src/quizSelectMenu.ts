
import { App,ItemView,Modal,getAllTags,Plugin} from 'obsidian';
import {languageTexts} from  './main';
import {QuizStartMenu} from './quizStartMenu';
import {saveLog} from './errorLog';

export class quizcPath{
    rootName:string;
    underPaths:quizcPath[];
    parent:quizcPath | null;

    constructor(rootName:string,underPaths?:quizcPath[],parent?:quizcPath){
        this.rootName = rootName;
        if(parent)
            this.parent = parent;
        else
            this.parent = null;

        if(underPaths)
            this.underPaths = underPaths;
        else
            this.underPaths = [];
    }

    addPath(newPath:quizcPath):number{
        return this.underPaths.push(newPath);
    }   
}

export class QuizSelectMenu{
    QuestionTab!:ItemView | null;
    QuestionModal!:Modal | null;

    quizStartMenu!:QuizStartMenu;

    ContentEl!:HTMLElement;
    app!:App;
    plugin:Plugin;

    rootPath!:quizcPath;

    selectQuizHeader!: HTMLElement;
    quizListDiv!: HTMLElement;
    quizTags:string[][] = [];
    quizcSQBackButtonDiv!:HTMLElement;

    activeQuizListPath!:quizcPath;
    quizListButtonIds:number = 0;

    constructor (QuestionTab:ItemView | null,QuestionModal:Modal | null,plugin:Plugin){
        if(QuestionTab){
            this.QuestionTab = QuestionTab;
            this.ContentEl = QuestionTab.contentEl;
            this.app = QuestionTab.app;
        }else
            this.QuestionTab = null;
        
        if(QuestionModal){
            this.QuestionModal = QuestionModal;
            this.ContentEl = QuestionModal.contentEl;
            this.app = QuestionModal.app;
        }else
            this.QuestionModal = null;

        this.plugin = plugin;
    }

    searchLocation(pathName:string,quizcPath:quizcPath) : quizcPath | null{
        for(const currentPath of quizcPath.underPaths){
            if(currentPath.rootName == pathName){
                return currentPath;
            }
        }
        return null;
    }

    locatePaths(pathNames:string[]){
        pathNames.shift();
        let currentPath:quizcPath = this.rootPath;
        let notFinded: boolean = false;
        for(const pathName of pathNames){
            if(notFinded == false){
                const temp = this.searchLocation(pathName,currentPath);
                if(temp){
                    currentPath = temp;
                }else{
                    notFinded = true;
                    const index = currentPath.addPath(new quizcPath(pathName,[],currentPath));
                    const newPath = currentPath.underPaths[index-1]!;
                    currentPath = newPath;
                }
            }else{
                const index = currentPath.addPath(new quizcPath(pathName,[],currentPath));
                const newPath = currentPath.underPaths[index-1]!;
                currentPath = newPath;
            }
        }
    }

    createPaths(){
        const files = this.app.vault.getMarkdownFiles();

        for(const file of files){ 
            const cache = this.app.metadataCache.getFileCache(file);
            if(!cache) return;

            const allTags = getAllTags(cache);
            if(!allTags)return;

            if(allTags[0] !== undefined && allTags[0].match("quizc")){
                this.quizTags.push([allTags[0],file.path]);
                this.locatePaths(allTags[0].split("/"));         
            }
        }
    }

    //Add all quiz in UI and create button events.

    addQuizLabelToList(pathName:string,path_?:quizcPath){
        const quizId = "quizc-sq-b" + this.quizListButtonIds.toString();
        this.quizListButtonIds++;

        this.quizListDiv.insertAdjacentHTML('beforeend',"<div class='quizc-sq-button-div'><button class='quizc-sq-button'></button></div>");
        const addedQuizLabelDiv = this.quizListDiv.lastChild;
        const addedQuizLabelButton = addedQuizLabelDiv!.firstChild as HTMLButtonElement;
        addedQuizLabelButton.id = quizId;
        addedQuizLabelButton.innerText = pathName;
        if(path_!= undefined && path_ != null && path_.underPaths.length > 0){
            const dropdownText = addedQuizLabelDiv?.createEl('p',{text:"⌄"});
            dropdownText!.classList.add("quizc-sq-button-expand");
        }
        if(addedQuizLabelButton){
            addedQuizLabelButton.addEventListener("click",async (event)=>{
                if(!event) return;
                const currentTarget = (event.currentTarget as HTMLElement).id.replace("quizc-sq-b","");
                const currentPath = this.activeQuizListPath.underPaths[Number(currentTarget)];
                if(currentPath)
                    this.activeQuizListPath = currentPath;
                this.quizListButtonIds = 0;
                this.addQuizInsidePath();
                if(this.activeQuizListPath.underPaths.length <= 0){
                    const curretnTagName = this.findFileLikeTag(this.activeQuizListPath.rootName);
                    this.activeQuizListPath = this.activeQuizListPath.parent!;
                    let quizNote;
                    if(curretnTagName){
                        const file = this.app.vault.getFileByPath(curretnTagName);
                        if(file)
                            quizNote = await this.app.vault.cachedRead(file);
                        else
                            quizNote = "";
                    }  
                    if(quizNote){
                        this.quizStartMenu = new QuizStartMenu(this.QuestionTab,this.QuestionModal,this.activeQuizListPath,this,this.plugin);
                        this.quizStartMenu.startQuiz(quizNote,this.activeQuizListPath.rootName!);
                    }
                }else{
                    
                }
            });
        }
    }

    addQuizInsidePath(){
        try{
            this.quizListDiv.innerHTML = "";
            for(const path_ of this.activeQuizListPath.underPaths){
                if(!path_) continue;
                this.addQuizLabelToList(path_.rootName,path_);
            }
        }catch(e){
            saveLog(this.plugin,e);
        }
    }

    createSelectQuizUI(){
        try{
            this.ContentEl.empty();
            this.selectQuizHeader = this.ContentEl.createEl('div', { text: languageTexts.selectQuizText.toUpperCase() });
            this.selectQuizHeader.classList.add("quizc-sq-header","inline-title");
            this.quizListDiv = this.ContentEl.createEl('div');
            this.quizListDiv.id = "quiz-list-container";

            this.quizcSQBackButtonDiv = this.ContentEl.createEl('div');
            this.quizcSQBackButtonDiv.classList.add("quizc-sq-button-div");
            this.quizcSQBackButtonDiv.insertAdjacentHTML('beforeend',"<button id='quizc-sq-back-button'><</button>");
            const backButton = this.ContentEl.querySelector("#quizc-sq-back-button");
            if(backButton){
                backButton.addEventListener('click',()=>{
                    if(this.activeQuizListPath.parent != null){
                        this.activeQuizListPath = this.activeQuizListPath.parent;
                        this.quizListButtonIds = 0;
                        this.addQuizInsidePath();
                    }
                });
            }
        }catch(e){
            saveLog(this.plugin,e);
        }
    }
    
    //This function find a file path with tag name.
    findFileLikeTag(tagName:string) : string | null{
        if(!this.quizTags) return null;

        for(const qtag of this.quizTags){
            if(qtag[0] != null && qtag[0].match(new RegExp(tagName))){
                if(qtag[1])
                    return qtag[1];
                else
                    return null;
            }
        }
        return null;
    }

    loadMainMenu(){
        this.rootPath = new quizcPath("root");
        this.activeQuizListPath = this.rootPath;

        this.createSelectQuizUI();
        
        this.createPaths();
        
        this.addQuizInsidePath();
    }
}