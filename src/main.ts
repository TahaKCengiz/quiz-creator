import {
	Modal,
	Plugin,
    addIcon,
    ItemView,
    WorkspaceLeaf,
    getAllTags,
    App,
    PluginSettingTab,
    IconName,
    getLanguage,
    normalizePath
} from 'obsidian';


const TAB_NAME = "quiz-tab";
let quizCreatorisOpen: boolean = false;

class quizcPath{
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

class answerPackage{
    answers:answer[];
    packageName:string;

    constructor(packageName:string,answers:answer[]){
        this.answers = answers;
        this.packageName = packageName;
    }
}

class answer{
    isCorrect:boolean;
    answerText:string;
    

    constructor(answerText:string,isCorrect:boolean){
        this.isCorrect = isCorrect;
        this.answerText = answerText;
    }
}

class question{
    questionText:string;
    questionAnswers:answer[];
    correctAnswerCount:number;
    wrongAnswerPackage:string;
    wantedWrongAnswersCount!:number;

    constructor(questionText:string,answers?:answer[],wantedWrongAnswersCount?:number,wrongAnswerPackage?:string){
        this.questionText = questionText;
        this.correctAnswerCount = 0;

        if(wantedWrongAnswersCount && wantedWrongAnswersCount >= 0)
            this.wantedWrongAnswersCount = wantedWrongAnswersCount;
        else
            this.wantedWrongAnswersCount = 0;

        if(wrongAnswerPackage)
            this.wrongAnswerPackage = wrongAnswerPackage;
        else
            this.wrongAnswerPackage = "";

        if(answers){
            this.questionAnswers = answers;
            for(const question_ of this.questionAnswers){
                if(question_.isCorrect)
                    this.correctAnswerCount++;
            }
        }else{
            this.questionAnswers = [];
        } 
    }
}

class QuizTab extends ItemView{
    constructor(leaf:WorkspaceLeaf){
        super(leaf);
        
    }
    
    getViewType(): string {
        return TAB_NAME;
    }

    getDisplayText(): string {
        return "QUIZ TAB";
    }
    
    //Quiz select menu variables.

    rootPath!:quizcPath;

    selectQuizHeader!: HTMLElement;
    quizListDiv!: HTMLElement;
    quizTags:string[][] = [];
    quizcSQBackButtonDiv!:HTMLElement;

    activeQuizListPath!:quizcPath;
    quizListButtonIds:number = 0;
    
    //Find and create paths section.  

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
                    let quizNote;
                    if(curretnTagName){
                        const file = this.app.vault.getFileByPath(curretnTagName);
                        if(file)
                            quizNote = await this.app.vault.cachedRead(file);
                        else
                            quizNote = "";
                    }  
                    if(quizNote){
                        this.startQuiz(quizNote,this.activeQuizListPath.rootName!);
                    }
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
            console.log(e);
        }
    }

    createSelectQuizUI(){
        try{
            this.contentEl.empty();
            this.selectQuizHeader = this.contentEl.createEl('div', { text: languageTexts.selectQuizText.toUpperCase() });
            this.selectQuizHeader.classList.add("quizc-sq-header","inline-title");
            this.quizListDiv = this.contentEl.createEl('div');
            this.quizListDiv.id = "quiz-list-container";

            this.quizcSQBackButtonDiv = this.contentEl.createEl('div');
            this.quizcSQBackButtonDiv.classList.add("quizc-sq-button-div");
            this.quizcSQBackButtonDiv.insertAdjacentHTML('beforeend',"<button id='quizc-sq-back-button'><</button>");
            const backButton = this.contentEl.querySelector("#quizc-sq-back-button");
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
            console.log(e);
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

    //Start quiz menu variables.

    questionCount!:number;
    questionList!:question[];
    questionListForReload!:question[];

    quizAnswerContainer!:HTMLElement;
    quizQuestionContainer!:HTMLElement | null;
    quizCorrectLabel!:HTMLElement | null;
    quizWrongLabel!:HTMLElement | null;
    currentAnswerStatus!:boolean | null;
    currentQuizName!:string;

    totalCorrectAnswer!:number;
    currentCorrectAnswer!:number;

    quizCorrectCounter!:number;
    quizWrongCounter!:number;
    quizEmptyCounter!:number;

    answerPackages!:answerPackage[];

    //Load last quiz result UI.
    loadQuizResultUI(){
        try{
            this.contentEl.empty();
            const resultQuizHeader = this.contentEl.createEl('div', { text: this.currentQuizName });
            resultQuizHeader.classList.add("quizc-sq-header","inline-title");
            resultQuizHeader.style = "display:flex; justify-content:center;";

            const resultContainer = this.contentEl.createEl('div');
            resultContainer.style = "width: fit-content; margin-left:auto; margin-right:auto;";

            const correctAnswerResult = resultContainer.createEl('div');
            correctAnswerResult.createSpan({text: languageTexts.correctText }).style = "width: 94px !important; display:inline-block;";
            correctAnswerResult.createSpan({text:this.quizCorrectCounter.toString()}).style.color = quizcSettings.correctColor;
            correctAnswerResult.classList.add("quizc-sq-header","inline-title","cm-header-3","cm-header");
            correctAnswerResult.style = "text-align:left !important; width: 100% !important;";

            const wrongAnswerResult = resultContainer.createEl('div');
            wrongAnswerResult.createSpan({text: languageTexts.wrongText }).style = "width: 94px !important; display:inline-block;";
            wrongAnswerResult.createSpan({text:this.quizWrongCounter.toString()}).style.color = quizcSettings.wrongColor;
            wrongAnswerResult.classList.add("quizc-sq-header","inline-title","cm-header-3","cm-header");
            wrongAnswerResult.style = "text-align:left !important; width: 100% !important;";

            const emptyAnswerResult = resultContainer.createEl('div');
            emptyAnswerResult.createSpan({text: languageTexts.emptyText }).style = "width: 94px !important; display:inline-block;";
            emptyAnswerResult.createSpan({text:this.quizEmptyCounter.toString()});
            emptyAnswerResult.classList.add("quizc-sq-header","inline-title","cm-header-3","cm-header");
            emptyAnswerResult.style = "text-align:left !important; width: 100% !important;";
            
            const resetButtonC = resultContainer.createEl('div');
            resetButtonC.style = "display: flex; align-items: center; justify-content:center;"
            const resetButton = resetButtonC.createEl('button',{text: languageTexts.reloadButton });

            const exitButtonC = resultContainer.createEl('div');
            exitButtonC.style = "display: flex; align-items: center; justify-content:center;"
            const exitButton = resetButtonC.createEl('button',{text: languageTexts.exitButton });
            
            resetButton.addEventListener('click', ()=>{
                this.reloadQuiz();
            });

            exitButton.addEventListener('click', ()=>{
                this.createSelectQuizUI();
                this.activeQuizListPath = this.activeQuizListPath.parent!;
                this.addQuizInsidePath();
            });
        }catch(e){
            console.log(e);
        }
    }

    //Add question button events to UI.
    addQuestionAnswerEvents(){
        try{
            const allWrongAnswers:HTMLElement[] = Array.from(this.contentEl.querySelectorAll<HTMLElement>(".quizc-wrong"));
            const allCorrectAnswers:HTMLElement[] = Array.from(this.contentEl.querySelectorAll<HTMLElement>(".quizc-correct"));

            const allAnswers = allWrongAnswers.concat(allCorrectAnswers);

            for(const answ of allAnswers){
                answ?.addEventListener('click',(event)=>{
                    if(!event) return;
                    const currentT:HTMLElement = event.currentTarget as HTMLElement;
                    if(!currentT) return;

                    if(currentT.classList.contains("quizc-correct")){
                        if(this.currentAnswerStatus == null){
                            this.currentCorrectAnswer++;
                            if(this.currentCorrectAnswer >= this.totalCorrectAnswer && this.quizCorrectLabel){
                                this.quizCorrectCounter++;
                                this.currentAnswerStatus = true;
                                let count = Number(this.quizCorrectLabel.textContent);
                                count++;
                                this.quizCorrectLabel.innerText = count.toString();
                            }  
                        }
                        currentT.style = "background:?? !important;".replace("??",quizcSettings.correctColor);
                    }else{
                        if(this.currentAnswerStatus == null){
                            this.currentAnswerStatus = false;
                            this.quizWrongCounter++;
                            if(this.quizWrongLabel){
                                let count = Number(this.quizWrongLabel.textContent);
                                count++;
                                this.quizWrongLabel.innerText = count.toString();
                            }  
                        }
                        const allCorrectAnswers = this.quizAnswerContainer.querySelectorAll<HTMLElement>(".quizc-correct");
                        if(allCorrectAnswers){
                            for(const correctAnswer of allCorrectAnswers){
                                correctAnswer.style = "background:?? !important;".replace("??",quizcSettings.correctColor);
                            }
                        }

                        currentT.style = "background:?? !important;".replace("??",quizcSettings.wrongColor);
                    }
                });
            }
        }catch(e){
            console.log(e);
        }
    }

    //Add answer text into UI.
    addAnswer(answer:string,isCorrect:boolean){
        try{
            if(!this.quizAnswerContainer || !answer) return;

            if(isCorrect){
                this.quizAnswerContainer.insertAdjacentHTML('beforeend',"<div style='display:flex; justify-content:center; margin-top:10px;'>"+
                                                                        "<button class='quizc-correct quizc-answer-button'></button></div>");
                (this.quizAnswerContainer.lastChild?.firstChild as HTMLButtonElement).innerText = answer;
            }else{
                this.quizAnswerContainer.insertAdjacentHTML('beforeend',"<div style='display:flex; justify-content:center; margin-top:10px;'>"+
                                                                        "<button class='quizc-wrong quizc-answer-button'></button></div>");
                (this.quizAnswerContainer.lastChild?.firstChild as HTMLButtonElement).innerText = answer;
            }
        }catch(e){
            console.log(e);
        }
    }

    //Add question text into UI.
    addQuestion(question_:question){
        try{
            if(!question_ || !this.quizQuestionContainer || !this.quizAnswerContainer) return;

            this.quizQuestionContainer.innerText = question_.questionText;

            this.quizAnswerContainer.innerHTML = "";

            this.totalCorrectAnswer = question_.correctAnswerCount;
            this.currentCorrectAnswer = 0;

            for(const answer_ of question_.questionAnswers){
                if(answer_.isCorrect){
                    this.addAnswer(answer_.answerText,true);
                }else{
                    this.addAnswer(answer_.answerText,false);
                }
            }
            this.addQuestionAnswerEvents();
        }catch(e){
            console.log(e);
        }
    }

    //Load question into the UI.
    loadQuestion(){
        this.currentAnswerStatus = null;
        const selectedIndex = Math.floor(Math.random()*this.questionList.length);
        const selectedQuestion = this.questionList[selectedIndex!];
        this.addQuestion(selectedQuestion!);
        this.questionList.splice(selectedIndex,1);
    }

    //Randomize question with question variables.
    randomizeQuestions(){
        for(let i = 0; i < this.questionList.length; i++){
            let newAnswerList:answer[] = [];
            const tmpArray = this.questionList[i]!.questionAnswers.slice();

            let correctAnswerCounter: number = 0;
            let selectedCorrectAnswers:answer[] = [];
            
            for(let j = 0;j < tmpArray.length;j++){
                if(tmpArray[j]!.isCorrect){
                    selectedCorrectAnswers.push(tmpArray[j]!);
                    tmpArray.splice(j,1);
                    j--;
                    correctAnswerCounter++;
                }
                if(correctAnswerCounter >= this.questionList[i]!.correctAnswerCount)
                    break;
            }
            newAnswerList = tmpArray;

            if(this.questionList[i]!.wrongAnswerPackage != ""){
                const wantedPackageName = this.questionList[i]!.wrongAnswerPackage;
                let wrongAnswerPackage: answerPackage|null = null;
                for(const package_ of this.answerPackages){
                    if(package_.packageName == wantedPackageName){
                        wrongAnswerPackage = package_;
                        break;
                    }
                }

                if(wrongAnswerPackage != null){
                    for(const wAnswer of wrongAnswerPackage.answers){
                        let isMatch:boolean = false;
                        for(const cAnswer of selectedCorrectAnswers){
                            if(wAnswer.answerText == cAnswer.answerText){
                                isMatch = true;
                                break;
                            }
                        }
                        if(!isMatch)
                            newAnswerList.push(wAnswer);
                   }
                }else{
                    newAnswerList = tmpArray;
                }
            }

            if(this.questionList[i]!.wantedWrongAnswersCount == 0){
                newAnswerList = newAnswerList.concat(selectedCorrectAnswers);
                const randomizedList: answer[] = [];

                while(newAnswerList.length > 0){
                    const randomAnswerIndex = Math.floor(Math.random()*newAnswerList.length);
                    randomizedList.push(newAnswerList[randomAnswerIndex]!);
                    newAnswerList.splice(randomAnswerIndex,1);
                }
                this.questionList[i]!.questionAnswers = randomizedList;
            }else{
                let selectedWrongAnswers:answer[] = [];
                let addedWrongAnswerCount:number = 0;

                while(newAnswerList.length > 0){
                    const randomWrongAnswerIndex = Math.floor(Math.random()*newAnswerList.length);
                    selectedWrongAnswers.push(newAnswerList[randomWrongAnswerIndex!]!);
                    newAnswerList.splice(randomWrongAnswerIndex,1);
                    addedWrongAnswerCount++;
                    if(addedWrongAnswerCount >= this.questionList[i]!.wantedWrongAnswersCount)
                        break;
                }

                let wrongAndCorrectAnswers = selectedWrongAnswers;

                while(selectedCorrectAnswers.length > 0){
                    const randomCorrectAnswerIndex = Math.floor(Math.random()*wrongAndCorrectAnswers.length);
                    const randomIndex = Math.floor(Math.random()*selectedCorrectAnswers.length);
                    wrongAndCorrectAnswers.splice(randomCorrectAnswerIndex,0,selectedCorrectAnswers[randomIndex]!);
                    selectedCorrectAnswers.splice(randomIndex,1);
                }
                this.questionList[i]!.questionAnswers = wrongAndCorrectAnswers;
            }
        }
    }

    //Generate quiz with note context.
    generateQuizWithContent(text:string){
        const lines = text.split("\n");
        lines.splice(0,1);
        this.questionList = [];
        this.questionCount = 0;
        
        let questionText:string = "";
        let answers:answer[] = [];

        let findQuestion:boolean = false;
        let currentAnswer:string = "";
        let correctAnswer:string = "";
        
        let countSpaceArea:number = 0;
        let maxSpaceArea:number = 50;

        this.answerPackages = [];
        let isFindAnswerPackages:boolean = false;
        let currentAnswerForPackage:string = "";
        let currentPackageName:string = "";
        let answersForPackage:answer[] = [];

        let questionWrongAnswerCount:number = 0;
        let selectedWrongAnswerPackage:string = "";

        this.answerPackages = [];

        for(const line of lines){
            if(!line.match(new RegExp("#quizc-package")) && !line.match(new RegExp("\\(!")) && !isFindAnswerPackages){
                if(!line.match(new RegExp("\\?")) && currentAnswer == "" && correctAnswer == ""){
                    if(line != ""){
                        if(findQuestion){
                            questionText += (line + " \n ");
                        }else{
                            questionText = (line + " \n ");
                            findQuestion = true;
                        }
                    }else if(findQuestion){
                        countSpaceArea++;
                        if(countSpaceArea == 0){
                            questionText = " \n ";
                        }else if(countSpaceArea >= maxSpaceArea){
                            questionText = "";
                            findQuestion = false;
                            countSpaceArea = 0;
                        }  
                    }
                }else{
                    if(line.match(new RegExp("\\?"))){
                        if(questionText == "") continue;

                        if(currentAnswer != ""){
                            answers.push(new answer(currentAnswer,false));
                            currentAnswer = "";
                        }

                        if(correctAnswer != ""){
                            answers.push(new answer(correctAnswer,true));
                            correctAnswer = "";
                        }

                        if(line.match(new RegExp("\\?\\?"))){
                            correctAnswer = line.replace("??","");
                        }else{
                            currentAnswer = line.replace("?","");
                        }
                    }else if(currentAnswer != ""){
                        if(line != ""){
                            currentAnswer += (line + " \n ");
                        }else{
                            answers.push(new answer(currentAnswer,false));
                            this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                            questionWrongAnswerCount = 0;
                            selectedWrongAnswerPackage = "";
                            questionText = "";
                            correctAnswer = "";
                            currentAnswer = "";
                            countSpaceArea = 0;
                            findQuestion = false;
                            answers = [];
                        }
                    }else if(correctAnswer != ""){
                        if(line != ""){
                            correctAnswer += (line + " \n ");
                        }else{
                            answers.push(new answer(correctAnswer,true));
                            this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                            questionWrongAnswerCount = 0;
                            selectedWrongAnswerPackage = "";
                            questionText = "";
                            correctAnswer = "";
                            currentAnswer = "";
                            countSpaceArea = 0;
                            findQuestion = false;
                            answers = [];
                        }
                    }else{
                        this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                        questionWrongAnswerCount = 0;
                        selectedWrongAnswerPackage = "";
                        questionText = "";
                        correctAnswer = "";
                        currentAnswer = "";
                        countSpaceArea = 0;
                        findQuestion = false;
                        answers = [];
                    }
                
                }
            }else if(line.match(new RegExp("\\(!")) && !isFindAnswerPackages){
                const parameters = line.replace("(!","").replace(")","").split(",");
                
                if(parameters[0] && parameters[0] != undefined)
                    questionWrongAnswerCount = Number(parameters[0]);
                
                if(parameters[1] && parameters[1] != undefined)
                    selectedWrongAnswerPackage = parameters[1];
            }else{
                if(!isFindAnswerPackages){
                    currentPackageName = line.replace("#quizc-package/","");
                    isFindAnswerPackages = true;
                }else{
                    if(line.match(new RegExp("\\?"))){
                        if(currentAnswerForPackage != ""){
                            answersForPackage.push(new answer(currentAnswerForPackage,false));
                            currentAnswerForPackage = line.replace("?","");
                        }else{
                            currentAnswerForPackage = line.replace("?","");
                        }
                    }else if(line != ""){
                        currentAnswerForPackage += (line+" \n ");
                    }else{
                        if(currentAnswerForPackage != ""){
                            answersForPackage.push(new answer(currentAnswerForPackage,false));
                        }
                        this.answerPackages.push(new answerPackage(currentPackageName,answersForPackage));
                        currentAnswerForPackage = "";
                        currentPackageName = "";
                        answersForPackage = [];
                        isFindAnswerPackages = false;
                    }
                }
            }
        }
        if(isFindAnswerPackages){
            if(currentAnswerForPackage != ""){
                answersForPackage.push(new answer(currentAnswerForPackage,false));
            }
            this.answerPackages.push(new answerPackage(currentPackageName,answersForPackage));
        }else{
            if(currentAnswer != "")
                answers.push(new answer(currentAnswer,false));

            if(correctAnswer != "")
                answers.push(new answer(correctAnswer,true));

            if(questionText != ""){
                this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                this.questionListForReload = this.questionList.slice();
            }
        }
    }

    //Reload current quiz.
    async reloadQuiz(){
        const curretnTagName = this.findFileLikeTag(this.activeQuizListPath.rootName);
        let quizNote;
        if(curretnTagName){
            const file = this.app.vault.getFileByPath(curretnTagName);
            if(file)
                quizNote = await this.app.vault.cachedRead(file);
            else
                quizNote = "";
        }  
        if(quizNote){
            this.startQuiz(quizNote,this.activeQuizListPath.rootName!);
        }
        if(quizNote != undefined)
            this.generateQuizWithContent(quizNote);
        else{
            this.loadMainMenu();
            return;
        }
        this.randomizeQuestions();
        this.createQuizUI(this.currentQuizName);
        this.loadQuestion();
    }

    //Start selected quiz.
    async startQuiz(quizNote:string,quizName:string){
        this.generateQuizWithContent(quizNote);
        this.randomizeQuestions();
        this.createQuizUI(quizName);
        this.loadQuestion();
    }

    //Load quiz UI.
    createQuizUI(quizName:string){
        try{
            this.contentEl.empty();
            this.quizEmptyCounter = 0;
            this.quizCorrectCounter = 0;
            this.quizWrongCounter = 0;
            this.currentQuizName = quizName;
            const startQuizHeader = this.contentEl.createEl('div', { text: this.currentQuizName });
            startQuizHeader.classList.add("quizc-sq-header","inline-title");
            startQuizHeader.style = "display:flex; justify-content:center;";
            startQuizHeader.insertAdjacentHTML('beforeend',"<div id='quizc-correct-answer'>12</div>");
            startQuizHeader.insertAdjacentHTML('beforeend',"<div id='quizc-wrong-answer'>13</div>");

            const quizCorrectL = this.containerEl.querySelector<HTMLElement>("#quizc-correct-answer");
            if(quizCorrectL)
                this.quizCorrectLabel = quizCorrectL;
            else
                this.quizCorrectLabel = null;

            if(this.quizCorrectLabel)
                this.quizCorrectLabel.innerText = "0";

            const quizWrongL = this.containerEl.querySelector<HTMLElement>("#quizc-wrong-answer");
            if(quizCorrectL)
                this.quizWrongLabel = quizWrongL;
            else
                this.quizWrongLabel = null;

            if(this.quizWrongLabel)
                this.quizWrongLabel.innerText = "0";
            
            const quizContainer = this.contentEl.createEl('div');
            quizContainer.id = "quizc-quiz-container";
            quizContainer.insertAdjacentHTML('beforeend',"<div id='quizc-quiz-question'></div>");
            
            const quizQuestionContainerTMP = this.contentEl.querySelector<HTMLElement>("#quizc-quiz-question");
            if(quizQuestionContainerTMP)
                this.quizQuestionContainer = quizQuestionContainerTMP;
            else
                this.quizQuestionContainer = null;
            
            this.quizAnswerContainer = this.contentEl.createEl('div');
            this.quizAnswerContainer.id = "quizc-answers-container";

            const nextButtonContainer = this.contentEl.createEl('div',);
            nextButtonContainer.classList.add("quizc-next-reset-container");
            const nextButton = nextButtonContainer.createEl('button',{text: languageTexts.nextButton});

            const exitButtonContainer = this.contentEl.createEl('div',);
            exitButtonContainer.classList.add("quizc-next-reset-container");
            const exitButton = exitButtonContainer.createEl('button',{text: languageTexts.exitButton });

            nextButton.classList.add("quizc-next-reset-button");
            exitButton.classList.add("quizc-next-reset-button");

            nextButton.addEventListener('click',(event)=>{
                if(this.currentAnswerStatus == null){
                    this.quizEmptyCounter++;
                }
                if(this.questionList.length > 0){
                    this.loadQuestion();
                }else{
                    this.loadQuizResultUI();
                }
            });

            exitButton.addEventListener('click',(event)=>{
                this.createSelectQuizUI();
                this.activeQuizListPath = this.activeQuizListPath.parent!;
                this.addQuizInsidePath();
            });
        }catch(e){
            console.log(e);
        }
    }

    async onOpen(){
        try{
            this.rootPath = new quizcPath("root");
            this.activeQuizListPath = this.rootPath;

            this.createSelectQuizUI();
            
            this.createPaths();
            
            this.addQuizInsidePath();
        }catch(e){
            console.log(e);
        }
    }

    async onClose(){
        quizCreatorisOpen = false;
    }
}

class QuizModal extends Modal{
    
    constructor(app:App){
        super(app);
        this.modalEl.classList.add("quizc-modal-class");
    }

    //Quiz select menu variables.

    rootPath!:quizcPath;

    selectQuizHeader!: HTMLElement;
    quizListDiv!: HTMLElement;
    quizTags:string[][] = [];
    quizcSQBackButtonDiv!:HTMLElement;

    activeQuizListPath!:quizcPath;
    quizListButtonIds:number = 0;
    
    //Find and create paths section.  

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
                    let quizNote;
                    if(curretnTagName){
                        const file = this.app.vault.getFileByPath(curretnTagName);
                        if(file)
                            quizNote = await this.app.vault.cachedRead(file);
                        else
                            quizNote = "";
                    }  
                    if(quizNote){
                        this.startQuiz(quizNote,this.activeQuizListPath.rootName!);
                    }
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
            console.log(e);
        }
    }

    createSelectQuizUI(){
        try{
            this.contentEl.empty();
            this.selectQuizHeader = this.contentEl.createEl('div', { text: languageTexts.selectQuizText.toUpperCase() });
            this.selectQuizHeader.classList.add("quizc-sq-header","inline-title");
            this.quizListDiv = this.contentEl.createEl('div');
            this.quizListDiv.id = "quiz-list-container";

            this.quizcSQBackButtonDiv = this.contentEl.createEl('div');
            this.quizcSQBackButtonDiv.classList.add("quizc-sq-button-div");
            this.quizcSQBackButtonDiv.insertAdjacentHTML('beforeend',"<button id='quizc-sq-back-button'><</button>");
            const backButton = this.contentEl.querySelector("#quizc-sq-back-button");
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
            console.log(e);
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

    //Start quiz menu variables.

    questionCount!:number;
    questionList!:question[];
    questionListForReload!:question[];

    quizAnswerContainer!:HTMLElement;
    quizQuestionContainer!:HTMLElement | null;
    quizCorrectLabel!:HTMLElement | null;
    quizWrongLabel!:HTMLElement | null;
    currentAnswerStatus!:boolean | null;
    currentQuizName!:string;

    totalCorrectAnswer!:number;
    currentCorrectAnswer!:number;

    quizCorrectCounter!:number;
    quizWrongCounter!:number;
    quizEmptyCounter!:number;

    answerPackages!:answerPackage[];

    //Load last quiz result UI.
    loadQuizResultUI(){
        try{
            this.contentEl.empty();
            const resultQuizHeader = this.contentEl.createEl('div', { text: this.currentQuizName });
            resultQuizHeader.classList.add("quizc-sq-header","inline-title");
            resultQuizHeader.style = "display:flex; justify-content:center;";

            const resultContainer = this.contentEl.createEl('div');
            resultContainer.style = "width: fit-content; margin-left:auto; margin-right:auto;";

            const correctAnswerResult = resultContainer.createEl('div');
            correctAnswerResult.createSpan({text: languageTexts.correctText }).style = "width: 94px !important; display:inline-block;";
            correctAnswerResult.createSpan({text:this.quizCorrectCounter.toString()}).style.color = quizcSettings.correctColor;
            correctAnswerResult.classList.add("quizc-sq-header","inline-title","cm-header-3","cm-header");
            correctAnswerResult.style = "text-align:left !important; width: 100% !important;";

            const wrongAnswerResult = resultContainer.createEl('div');
            wrongAnswerResult.createSpan({text: languageTexts.wrongText }).style = "width: 94px !important; display:inline-block;";
            wrongAnswerResult.createSpan({text:this.quizWrongCounter.toString()}).style.color = quizcSettings.wrongColor;
            wrongAnswerResult.classList.add("quizc-sq-header","inline-title","cm-header-3","cm-header");
            wrongAnswerResult.style = "text-align:left !important; width: 100% !important;";

            const emptyAnswerResult = resultContainer.createEl('div');
            emptyAnswerResult.createSpan({text: languageTexts.emptyText }).style = "width: 94px !important; display:inline-block;";
            emptyAnswerResult.createSpan({text:this.quizEmptyCounter.toString()});
            emptyAnswerResult.classList.add("quizc-sq-header","inline-title","cm-header-3","cm-header");
            emptyAnswerResult.style = "text-align:left !important; width: 100% !important;";
            
            const resetButtonC = resultContainer.createEl('div');
            resetButtonC.style = "display: flex; align-items: center; justify-content:center;"
            const resetButton = resetButtonC.createEl('button',{text: languageTexts.reloadButton });

            const exitButtonC = resultContainer.createEl('div');
            exitButtonC.style = "display: flex; align-items: center; justify-content:center;"
            const exitButton = resetButtonC.createEl('button',{text: languageTexts.exitButton });
            
            resetButton.addEventListener('click', ()=>{
                this.reloadQuiz();
            });

            exitButton.addEventListener('click', ()=>{
                this.createSelectQuizUI();
                this.activeQuizListPath = this.activeQuizListPath.parent!;
                this.addQuizInsidePath();
            });
        }catch(e){
            console.log(e);
        }
    }

    //Add question button events to UI.
    addQuestionAnswerEvents(){
        try{
            const allWrongAnswers:HTMLElement[] = Array.from(this.contentEl.querySelectorAll<HTMLElement>(".quizc-wrong"));
            const allCorrectAnswers:HTMLElement[] = Array.from(this.contentEl.querySelectorAll<HTMLElement>(".quizc-correct"));

            const allAnswers = allWrongAnswers.concat(allCorrectAnswers);

            for(const answ of allAnswers){
                answ?.addEventListener('click',(event)=>{
                    if(!event) return;
                    const currentT:HTMLElement = event.currentTarget as HTMLElement;
                    if(!currentT) return;

                    if(currentT.classList.contains("quizc-correct")){
                        if(this.currentAnswerStatus == null){
                            this.currentCorrectAnswer++;
                            if(this.currentCorrectAnswer >= this.totalCorrectAnswer && this.quizCorrectLabel){
                                this.quizCorrectCounter++;
                                this.currentAnswerStatus = true;
                                let count = Number(this.quizCorrectLabel.textContent);
                                count++;
                                this.quizCorrectLabel.innerText = count.toString();
                            }  
                        }
                        currentT.style = "background:?? !important;".replace("??",quizcSettings.correctColor);
                    }else{
                        if(this.currentAnswerStatus == null){
                            this.currentAnswerStatus = false;
                            this.quizWrongCounter++;
                            if(this.quizWrongLabel){
                                let count = Number(this.quizWrongLabel.textContent);
                                count++;
                                this.quizWrongLabel.innerText = count.toString();
                            }  
                        }
                        const allCorrectAnswers = this.quizAnswerContainer.querySelectorAll<HTMLElement>(".quizc-correct");
                        if(allCorrectAnswers){
                            for(const correctAnswer of allCorrectAnswers){
                                correctAnswer.style = "background:?? !important;".replace("??",quizcSettings.correctColor);
                            }
                        }

                        currentT.style = "background:?? !important;".replace("??",quizcSettings.wrongColor);
                    }
                });
            }
        }catch(e){
            console.log(e);
        }
    }

    //Add answer text into UI.
    addAnswer(answer:string,isCorrect:boolean){
        try{
            if(!this.quizAnswerContainer || !answer) return;

            if(isCorrect){
                this.quizAnswerContainer.insertAdjacentHTML('beforeend',"<div style='display:flex; justify-content:center; margin-top:10px;'>"+
                                                                        "<button class='quizc-correct quizc-answer-button'></button></div>");
                (this.quizAnswerContainer.lastChild?.firstChild as HTMLButtonElement).innerText = answer;
            }else{
                this.quizAnswerContainer.insertAdjacentHTML('beforeend',"<div style='display:flex; justify-content:center; margin-top:10px;'>"+
                                                                        "<button class='quizc-wrong quizc-answer-button'></button></div>");
                (this.quizAnswerContainer.lastChild?.firstChild as HTMLButtonElement).innerText = answer;
            }
        }catch(e){
            console.log(e);
        }
    }

    //Add question text into UI.
    addQuestion(question_:question){
        try{
            if(!question_ || !this.quizQuestionContainer || !this.quizAnswerContainer) return;

            this.quizQuestionContainer.innerText = question_.questionText;

            this.quizAnswerContainer.innerHTML = "";

            this.totalCorrectAnswer = question_.correctAnswerCount;
            this.currentCorrectAnswer = 0;

            for(const answer_ of question_.questionAnswers){
                if(answer_.isCorrect){
                    this.addAnswer(answer_.answerText,true);
                }else{
                    this.addAnswer(answer_.answerText,false);
                }
            }
            this.addQuestionAnswerEvents();
        }catch(e){
            console.log(e);
        }
    }

    //Load question into the UI.
    loadQuestion(){
        this.currentAnswerStatus = null;
        const selectedIndex = Math.floor(Math.random()*this.questionList.length);
        const selectedQuestion = this.questionList[selectedIndex!];
        this.addQuestion(selectedQuestion!);
        this.questionList.splice(selectedIndex,1);
    }

    //Randomize question with question variables.
    randomizeQuestions(){
        for(let i = 0; i < this.questionList.length; i++){
            let newAnswerList:answer[] = [];
            const tmpArray = this.questionList[i]!.questionAnswers.slice();

            let correctAnswerCounter: number = 0;
            let selectedCorrectAnswers:answer[] = [];
            
            for(let j = 0;j < tmpArray.length;j++){
                if(tmpArray[j]!.isCorrect){
                    selectedCorrectAnswers.push(tmpArray[j]!);
                    tmpArray.splice(j,1);
                    j--;
                    correctAnswerCounter++;
                }
                if(correctAnswerCounter >= this.questionList[i]!.correctAnswerCount)
                    break;
            }
            newAnswerList = tmpArray;

            if(this.questionList[i]!.wrongAnswerPackage != ""){
                const wantedPackageName = this.questionList[i]!.wrongAnswerPackage;
                let wrongAnswerPackage: answerPackage|null = null;
                for(const package_ of this.answerPackages){
                    if(package_.packageName == wantedPackageName){
                        wrongAnswerPackage = package_;
                        break;
                    }
                }

                if(wrongAnswerPackage != null){
                    for(const wAnswer of wrongAnswerPackage.answers){
                        let isMatch:boolean = false;
                        for(const cAnswer of selectedCorrectAnswers){
                            if(wAnswer.answerText == cAnswer.answerText){
                                isMatch = true;
                                break;
                            }
                        }
                        if(!isMatch)
                            newAnswerList.push(wAnswer);
                    }
                }else{
                    newAnswerList = tmpArray;
                }
            }

            if(this.questionList[i]!.wantedWrongAnswersCount == 0){
                newAnswerList = newAnswerList.concat(selectedCorrectAnswers);
                const randomizedList: answer[] = [];

                while(newAnswerList.length > 0){
                    const randomAnswerIndex = Math.floor(Math.random()*newAnswerList.length);
                    randomizedList.push(newAnswerList[randomAnswerIndex]!);
                    newAnswerList.splice(randomAnswerIndex,1);
                }
                this.questionList[i]!.questionAnswers = randomizedList;
            }else{
                let selectedWrongAnswers:answer[] = [];
                let addedWrongAnswerCount:number = 0;

                while(newAnswerList.length > 0){
                    const randomWrongAnswerIndex = Math.floor(Math.random()*newAnswerList.length);
                    selectedWrongAnswers.push(newAnswerList[randomWrongAnswerIndex!]!);
                    newAnswerList.splice(randomWrongAnswerIndex,1);
                    addedWrongAnswerCount++;
                    if(addedWrongAnswerCount >= this.questionList[i]!.wantedWrongAnswersCount)
                        break;
                }

                let wrongAndCorrectAnswers = selectedWrongAnswers;

                while(selectedCorrectAnswers.length > 0){
                    const randomCorrectAnswerIndex = Math.floor(Math.random()*wrongAndCorrectAnswers.length);
                    const randomIndex = Math.floor(Math.random()*selectedCorrectAnswers.length);
                    wrongAndCorrectAnswers.splice(randomCorrectAnswerIndex,0,selectedCorrectAnswers[randomIndex]!);
                    selectedCorrectAnswers.splice(randomIndex,1);
                }
                this.questionList[i]!.questionAnswers = wrongAndCorrectAnswers;
            }
        }
    }

    //Generate quiz with note context.
    generateQuizWithContent(text:string){
        const lines = text.split("\n");
        lines.splice(0,1);
        this.questionList = [];
        this.questionCount = 0;
        
        let questionText:string = "";
        let answers:answer[] = [];

        let findQuestion:boolean = false;
        let currentAnswer:string = "";
        let correctAnswer:string = "";
        
        let countSpaceArea:number = 0;
        let maxSpaceArea:number = 50;

        this.answerPackages = [];
        let isFindAnswerPackages:boolean = false;
        let currentAnswerForPackage:string = "";
        let currentPackageName:string = "";
        let answersForPackage:answer[] = [];

        let questionWrongAnswerCount:number = 0;
        let selectedWrongAnswerPackage:string = "";

        this.answerPackages = [];

        for(const line of lines){
            if(!line.match(new RegExp("#quizc-package")) && !line.match(new RegExp("\\(!")) && !isFindAnswerPackages){
                if(!line.match(new RegExp("\\?")) && currentAnswer == "" && correctAnswer == ""){
                    if(line != ""){
                        if(findQuestion){
                            questionText += (line + " \n ");
                        }else{
                            questionText = (line + " \n ");
                            findQuestion = true;
                        }
                    }else if(findQuestion){
                        countSpaceArea++;
                        if(countSpaceArea == 0){
                            questionText = " \n ";
                        }else if(countSpaceArea >= maxSpaceArea){
                            questionText = "";
                            findQuestion = false;
                            countSpaceArea = 0;
                        }  
                    }
                }else{
                    if(line.match(new RegExp("\\?"))){
                        if(questionText == "") continue;

                        if(currentAnswer != ""){
                            answers.push(new answer(currentAnswer,false));
                            currentAnswer = "";
                        }

                        if(correctAnswer != ""){
                            answers.push(new answer(correctAnswer,true));
                            correctAnswer = "";
                        }

                        if(line.match(new RegExp("\\?\\?"))){
                            correctAnswer = line.replace("??","");
                        }else{
                            currentAnswer = line.replace("?","");
                        }
                    }else if(currentAnswer != ""){
                        if(line != ""){
                            currentAnswer += (line + " \n ");
                        }else{
                            answers.push(new answer(currentAnswer,false));
                            this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                            questionWrongAnswerCount = 0;
                            selectedWrongAnswerPackage = "";
                            questionText = "";
                            correctAnswer = "";
                            currentAnswer = "";
                            countSpaceArea = 0;
                            findQuestion = false;
                            answers = [];
                        }
                    }else if(correctAnswer != ""){
                        if(line != ""){
                            correctAnswer += (line + " \n ");
                        }else{
                            answers.push(new answer(correctAnswer,true));
                            this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                            questionWrongAnswerCount = 0;
                            selectedWrongAnswerPackage = "";
                            questionText = "";
                            correctAnswer = "";
                            currentAnswer = "";
                            countSpaceArea = 0;
                            findQuestion = false;
                            answers = [];
                        }
                    }else{
                        this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                        questionWrongAnswerCount = 0;
                        selectedWrongAnswerPackage = "";
                        questionText = "";
                        correctAnswer = "";
                        currentAnswer = "";
                        countSpaceArea = 0;
                        findQuestion = false;
                        answers = [];
                    }
                
                }
            }else if(line.match(new RegExp("\\(!")) && !isFindAnswerPackages){
                const parameters = line.replace("(!","").replace(")","").split(",");
                
                if(parameters[0] && parameters[0] != undefined)
                    questionWrongAnswerCount = Number(parameters[0]);
                
                if(parameters[1] && parameters[1] != undefined)
                    selectedWrongAnswerPackage = parameters[1];
            }else{
                if(!isFindAnswerPackages){
                    currentPackageName = line.replace("#quizc-package/","");
                    isFindAnswerPackages = true;
                }else{
                    if(line.match(new RegExp("\\?"))){
                        if(currentAnswerForPackage != ""){
                            answersForPackage.push(new answer(currentAnswerForPackage,false));
                            currentAnswerForPackage = line.replace("?","");
                        }else{
                            currentAnswerForPackage = line.replace("?","");
                        }
                    }else if(line != ""){
                        currentAnswerForPackage += (line+" \n ");
                    }else{
                        if(currentAnswerForPackage != ""){
                            answersForPackage.push(new answer(currentAnswerForPackage,false));
                        }
                        this.answerPackages.push(new answerPackage(currentPackageName,answersForPackage));
                        currentAnswerForPackage = "";
                        currentPackageName = "";
                        answersForPackage = [];
                        isFindAnswerPackages = false;
                    }
                }
            }
        }
        if(isFindAnswerPackages){
            if(currentAnswerForPackage != ""){
                answersForPackage.push(new answer(currentAnswerForPackage,false));
            }
            this.answerPackages.push(new answerPackage(currentPackageName,answersForPackage));
        }else{
            if(currentAnswer != "")
                answers.push(new answer(currentAnswer,false));

            if(correctAnswer != "")
                answers.push(new answer(correctAnswer,true));

            if(questionText != ""){
                this.questionList.push(new question(questionText,answers,questionWrongAnswerCount,selectedWrongAnswerPackage));
                this.questionListForReload = this.questionList.slice();
            }
        }
    }

    //Reload current quiz.
    async reloadQuiz(){
        const curretnTagName = this.findFileLikeTag(this.activeQuizListPath.rootName);
        let quizNote;
        if(curretnTagName){
            const file = this.app.vault.getFileByPath(curretnTagName);
            if(file)
                quizNote = await this.app.vault.cachedRead(file);
            else
                quizNote = "";
        }  
        if(quizNote){
            this.startQuiz(quizNote,this.activeQuizListPath.rootName!);
        }
        if(quizNote != undefined)
            this.generateQuizWithContent(quizNote);
        else{
            this.loadMainMenu();
            return;
        }
        this.randomizeQuestions();
        this.createQuizUI(this.currentQuizName);
        this.loadQuestion();
    }

    //Start selected quiz.
    async startQuiz(quizNote:string,quizName:string){
        this.generateQuizWithContent(quizNote);
        this.randomizeQuestions();
        this.createQuizUI(quizName);
        this.loadQuestion();
    }

    //Load quiz UI.
    createQuizUI(quizName:string){
        try{
            this.contentEl.empty();
            this.quizEmptyCounter = 0;
            this.quizCorrectCounter = 0;
            this.quizWrongCounter = 0;
            this.currentQuizName = quizName;
            const startQuizHeader = this.contentEl.createEl('div', { text: this.currentQuizName });
            startQuizHeader.classList.add("quizc-sq-header","inline-title");
            startQuizHeader.style = "display:flex; justify-content:center;";
            startQuizHeader.insertAdjacentHTML('beforeend',"<div id='quizc-correct-answer'>12</div>");
            startQuizHeader.insertAdjacentHTML('beforeend',"<div id='quizc-wrong-answer'>13</div>");

            const quizCorrectL = this.containerEl.querySelector<HTMLElement>("#quizc-correct-answer");
            if(quizCorrectL)
                this.quizCorrectLabel = quizCorrectL;
            else
                this.quizCorrectLabel = null;

            if(this.quizCorrectLabel)
                this.quizCorrectLabel.innerText = "0";

            const quizWrongL = this.containerEl.querySelector<HTMLElement>("#quizc-wrong-answer");
            if(quizCorrectL)
                this.quizWrongLabel = quizWrongL;
            else
                this.quizWrongLabel = null;

            if(this.quizWrongLabel)
                this.quizWrongLabel.innerText = "0";
            
            const quizContainer = this.contentEl.createEl('div');
            quizContainer.id = "quizc-quiz-container";
            quizContainer.insertAdjacentHTML('beforeend',"<div id='quizc-quiz-question'></div>");
            
            const quizQuestionContainerTMP = this.contentEl.querySelector<HTMLElement>("#quizc-quiz-question");
            if(quizQuestionContainerTMP)
                this.quizQuestionContainer = quizQuestionContainerTMP;
            else
                this.quizQuestionContainer = null;
            
            this.quizAnswerContainer = this.contentEl.createEl('div');
            this.quizAnswerContainer.id = "quizc-answers-container";

            const nextButtonContainer = this.contentEl.createEl('div',);
            nextButtonContainer.classList.add("quizc-next-reset-container");
            const nextButton = nextButtonContainer.createEl('button',{text: languageTexts.nextButton});

            const exitButtonContainer = this.contentEl.createEl('div',);
            exitButtonContainer.classList.add("quizc-next-reset-container");
            const exitButton = exitButtonContainer.createEl('button',{text: languageTexts.exitButton });

            nextButton.classList.add("quizc-next-reset-button");
            exitButton.classList.add("quizc-next-reset-button");

            nextButton.addEventListener('click',(event)=>{
                if(this.currentAnswerStatus == null){
                    this.quizEmptyCounter++;
                }
                if(this.questionList.length > 0){
                    this.loadQuestion();
                }else{
                    this.loadQuizResultUI();
                }
            });

            exitButton.addEventListener('click',(event)=>{
                this.createSelectQuizUI();
                this.activeQuizListPath = this.activeQuizListPath.parent!;
                this.addQuizInsidePath();
            });
        }catch(e){
            console.log(e);
        }
    }

    async onOpen(){
        try{
            this.rootPath = new quizcPath("root");
            this.activeQuizListPath = this.rootPath;

            this.createSelectQuizUI();
            
            this.createPaths();
            
            this.addQuizInsidePath();
        }catch(e){
            console.log(e);
        }
    }

    async onClose(){
        quizCreatorisOpen = false;
    }

}

let quizCreatorUI:Modal;
let quizCreatorTab:WorkspaceLeaf;

class appSettingTab extends PluginSettingTab{
    icon: IconName;
    language_container!:HTMLElement;
    plugin:QuizCreator;

    selectQuestionButtonWidthInput!:HTMLInputElement;
    generalNavigationButtonWidth!:HTMLInputElement;
    selectQuestionButtonMarginInput!:HTMLInputElement;
    quizMenuElementsMarginInput!:HTMLInputElement;
    quizMenuAnswerWidthInput!:HTMLInputElement;
    languageDropdownInput!:HTMLInputElement;
    openExternalTabInput!:HTMLInputElement;
    correctColorInput!:HTMLInputElement;
    wrongColorInput!:HTMLInputElement;

    openExternalTabLabel!:HTMLLabelElement;

    constructor(app:App,plugin:QuizCreator){
        super(app,plugin);
        this.plugin = plugin;
        this.icon = "quizc-icon";
    }

    display(): void {
        this.containerEl.empty();

        const languageDropdownContainer = this.containerEl.createDiv();
        languageDropdownContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        languageDropdownContainer.createSpan({text:"Question Button Width"}).style = "margin-right:5px; width:175px;";
        languageDropdownContainer.insertAdjacentHTML('beforeend',"<select class='dropdown' style='--dropdown-fitted-width: 175px;'>"+
                                                                 "<option value='tr'>Türkçe</option>"+
                                                                 "<option value='en'>English</option>"+
                                                                 "</select>");
        this.languageDropdownInput = languageDropdownContainer.lastChild as HTMLInputElement;
        this.languageDropdownInput.value = this.plugin.settings.language;

        const openExternalTabContainer = this.containerEl.createDiv();
        openExternalTabContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        openExternalTabContainer.createSpan({text:"Open External Tab"}).style = "margin-right:5px; width:175px;";
        openExternalTabContainer.insertAdjacentHTML('beforeend',"<label class='checkbox-container'><input type='checkbox'></label>");
        this.openExternalTabLabel = openExternalTabContainer.lastChild as HTMLLabelElement;
        this.openExternalTabInput = this.openExternalTabLabel.lastChild as HTMLInputElement;
        this.openExternalTabInput.value = quizcSettings.externalTab;
        if(quizcSettings.externalTab == "true"){
            this.openExternalTabLabel.classList.add("is-enabled");
        }

        this.openExternalTabInput.addEventListener('click',()=>{
            if(this.openExternalTabLabel.classList.contains("is-enabled")){
                this.openExternalTabLabel.classList.remove("is-enabled");
            }else{
                this.openExternalTabLabel.classList.add("is-enabled");
            }

            if(this.openExternalTabInput.value == "false"){
                this.openExternalTabInput.value = "true";
            }else{
                this.openExternalTabInput.value = "false";
            }
        });

        const selectQuestionButtonWidthConainer = this.containerEl.createDiv();
        selectQuestionButtonWidthConainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        selectQuestionButtonWidthConainer.createSpan({text:"Question Button Width"}).style = "margin-right:5px; width:175px;";
        selectQuestionButtonWidthConainer.insertAdjacentHTML('beforeend',"<input type='text'>");
        (selectQuestionButtonWidthConainer.lastChild as HTMLInputElement).value = quizcSettings.selectQuestionButtonWidth;
        this.selectQuestionButtonWidthInput = selectQuestionButtonWidthConainer.lastChild as HTMLInputElement;

        const generalNavigationButtonContainer = this.containerEl.createDiv();
        generalNavigationButtonContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        generalNavigationButtonContainer.createSpan({text:"Navigation Buttons Width"}).style = "margin-right:5px; width:175px;";
        generalNavigationButtonContainer.insertAdjacentHTML('beforeend',"<input type='text'>");
        (generalNavigationButtonContainer.lastChild as HTMLInputElement).value = quizcSettings.nextResetExitButtonWidth;
        this.generalNavigationButtonWidth = generalNavigationButtonContainer.lastChild as HTMLInputElement;

        const selectQuestionButtonMarginContainer = this.containerEl.createDiv();
        selectQuestionButtonMarginContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        selectQuestionButtonMarginContainer.createSpan({text:"Select Question Button Margin"}).style = "margin-right:5px; width:175px;";
        selectQuestionButtonMarginContainer.insertAdjacentHTML('beforeend',"<input type='text'>");
        (selectQuestionButtonMarginContainer.lastChild as HTMLInputElement).value = quizcSettings.selectQuestionElementMargin;
        this.selectQuestionButtonMarginInput = selectQuestionButtonMarginContainer.lastChild as HTMLInputElement;

        const quizMenuElementsMarginContainer = this.containerEl.createDiv();
        quizMenuElementsMarginContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        quizMenuElementsMarginContainer.createSpan({text:"Quiz Element Margin"}).style = "margin-right:5px; width:175px;";
        quizMenuElementsMarginContainer.insertAdjacentHTML('beforeend',"<input type='text'>");
        (quizMenuElementsMarginContainer.lastChild as HTMLInputElement).value = quizcSettings.quizMenuElementMargin;
        this.quizMenuElementsMarginInput = quizMenuElementsMarginContainer.lastChild as HTMLInputElement;
        
        const quizMenuAnswerWidthContainer = this.containerEl.createDiv();
        quizMenuAnswerWidthContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        quizMenuAnswerWidthContainer.createSpan({text:"Quiz Element Width"}).style = "margin-right:5px; width:175px;";
        quizMenuAnswerWidthContainer.insertAdjacentHTML('beforeend',"<input type='text'>");
        (quizMenuAnswerWidthContainer.lastChild as HTMLInputElement).value = quizcSettings.quizMenuElementWidth;
        this.quizMenuAnswerWidthInput = quizMenuAnswerWidthContainer.lastChild as HTMLInputElement;

        const pickCorrectColorContainer = this.containerEl.createDiv();
        pickCorrectColorContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        pickCorrectColorContainer.createSpan({text:"Correct Color"}).style = "margin-right:5px; width:92px;";
        pickCorrectColorContainer.insertAdjacentHTML('beforeend',"<input type='color'>");
        (pickCorrectColorContainer.lastChild as HTMLInputElement).value = quizcSettings.correctColor;
        this.correctColorInput = pickCorrectColorContainer.lastChild as HTMLInputElement;

        const pickWrongColorContainer = this.containerEl.createDiv();
        pickWrongColorContainer.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        pickWrongColorContainer.createSpan({text:"Wrong Color"}).style = "margin-right:5px; width:92px;";
        pickWrongColorContainer.insertAdjacentHTML('beforeend',"<input type='color'>");
        (pickWrongColorContainer.lastChild as HTMLInputElement).value = quizcSettings.wrongColor;
        this.wrongColorInput = pickWrongColorContainer.lastChild as HTMLInputElement;

        const saveButtonContainer = this.containerEl.createDiv();
        const saveButton = saveButtonContainer.createEl('button',{text:"Save"});
        saveButton.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        saveButton.addEventListener('click',()=>{
            quizcSettings.language = this.languageDropdownInput.value;
            quizcSettings.selectQuestionButtonWidth = this.selectQuestionButtonWidthInput.value;
            quizcSettings.nextResetExitButtonWidth = this.generalNavigationButtonWidth.value;
            quizcSettings.selectQuestionElementMargin = this.selectQuestionButtonMarginInput.value;
            quizcSettings.quizMenuElementMargin = this.quizMenuElementsMarginInput.value;
            quizcSettings.quizMenuElementWidth = this.quizMenuAnswerWidthInput.value;
            quizcSettings.correctColor = this.correctColorInput.value;
            quizcSettings.wrongColor = this.wrongColorInput.value;
            quizcSettings.externalTab = this.openExternalTabInput.value;
            this.plugin.settings = quizcSettings;
            this.plugin.saveSettings();
            applySettings(this.app);
            this.display();
        });

        const resetButtonContainer = this.containerEl.createDiv();
        const resetButton = resetButtonContainer.createEl('button',{text:"Reset"});
        resetButton.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        resetButton.addEventListener('click',()=>{
            quizcSettings ={
                            selectQuestionButtonWidth  :"200px",
                            nextResetExitButtonWidth   :"100px",
                            selectQuestionElementMargin:"5px",
                            correctColor               :"#32CD32",
                            wrongColor                 :"#FF2C2C",
                            quizMenuElementWidth       :"65%",
                            quizMenuElementMargin      :"10px",
                            language                   :getLanguage(),
                            externalTab                :"false"
                        };
            this.plugin.settings = quizcSettings;
            this.plugin.saveSettings();
            applySettings(this.app);
            this.display();
        });
    }

    hide(): void {
        
    }
}

interface appSetting{
    "selectQuestionButtonWidth"  :string;
    "nextResetExitButtonWidth"   :string;
    "selectQuestionElementMargin":string;
    "correctColor"               :string;
    "wrongColor"                 :string;
    "quizMenuElementWidth"       :string;
    "quizMenuElementMargin"      :string;
    "language"                   :string;
    "externalTab"                :string;
}

interface languageText{
    nextButton:string,
    exitButton:string,
    reloadButton:string,
    selectQuizText:string,
    resulText:string,
    correctText:string,
    wrongText:string,
    emptyText:string
}

function applySettings(app:App){
    document.documentElement.style.setProperty("--quizc-selectQ-button-width",quizcSettings.selectQuestionButtonWidth);
    document.documentElement.style.setProperty("--quizc-next-reset-exit-button-width",quizcSettings.nextResetExitButtonWidth);
    document.documentElement.style.setProperty("--quizc-selectq-button-margin",quizcSettings.selectQuestionElementMargin);
    document.documentElement.style.setProperty("--quizc-correct-color",quizcSettings.correctColor);
    document.documentElement.style.setProperty("--quizc-wrong-color",quizcSettings.wrongColor);
    document.documentElement.style.setProperty("--quizc-quiz-answer-with",quizcSettings.quizMenuElementWidth);
    document.documentElement.style.setProperty("--quizc-quiz-button-margin",quizcSettings.quizMenuElementMargin);
}

let quizcSettings!:appSetting;

let isExtendedWindow:boolean = false;

let languageTexts:languageText;

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
                if(quizCreatorisOpen){ 
                    await this.app.workspace.revealLeaf(quizCreatorTab);
                    return;
                }
                
                quizCreatorisOpen = true
                quizCreatorTab = this.app.workspace.openPopoutLeaf();

                await quizCreatorTab.setViewState({
                    type: "quiz-tab",
                    active: true,
                });
            }else{
                this.app.workspace.containerEl.focus();

                setTimeout(() => {
                    quizCreatorUI = new QuizModal(this.app);
                    quizCreatorUI.open();
                }, 50);
            }
        });

        await this.loadLanguageJSON();

        if(!this.settings){
            quizcSettings ={
                            selectQuestionButtonWidth  :"200px",
                            nextResetExitButtonWidth   :"100px",
                            selectQuestionElementMargin:"5px",
                            correctColor               :"#32CD32",
                            wrongColor                 :"#FF2C2C",
                            quizMenuElementWidth       :"65%",
                            quizMenuElementMargin      :"10px",
                            language                   :this.loadLanguage(getLanguage()),
                            externalTab                :"false"
                        };
            applySettings(this.app);
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
                console.log(e);
                quizcSettings ={
                            selectQuestionButtonWidth  : this.loadLanguage("en"),
                            nextResetExitButtonWidth   :"200px",
                            selectQuestionElementMargin:"100px",
                            correctColor               :"5px",
                            wrongColor                 :"#32CD32",
                            quizMenuElementWidth       :"#FF2C2C",
                            quizMenuElementMargin      :"65%",
                            language                   :"10px",
                            externalTab                :"false"
                        };
                this.settings = quizcSettings;
                this.saveSettings();
            }
            applySettings(this.app);
        }

		this.addSettingTab(new appSettingTab(this.app,this));
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
        const content = await this.app.vault.adapter.write(normalizedPath,languageText);
        languageContentJSON =JSON.parse(languageText);
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
            console.log(e);
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
            console.log(e);
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

	onunload() {}

	async loadSettings() {
		this.settings = await this.loadData();
	}

	async saveSettings() {
		await this.saveData(this.settings);
        this.loadLanguage(this.settings.language);
	}
}
