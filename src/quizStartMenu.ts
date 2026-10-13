import { App,ItemView,Modal,Plugin} from 'obsidian';
import {languageTexts,quizcSettings} from  './main';
import {quizcPath,QuizSelectMenu} from  './quizSelectMenu';
import {question,answer,answerPackage,generateQuizWithContent} from './generateQuizWithContent';
import {saveLog} from './errorLog';

export class QuizStartMenu{
    QuestionTab!:ItemView | null;
    QuestionModal!:Modal | null;

    parentMenu!:QuizSelectMenu;

    ContentEl!:HTMLElement;
    app!:App;
    plugin:Plugin;

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
    
    activeQuizListPath!:quizcPath;

    constructor (QuestionTab:ItemView | null,QuestionModal:Modal | null,activeQuizListPath:quizcPath,parentMenu:QuizSelectMenu,plugin:Plugin){
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

        this.activeQuizListPath = activeQuizListPath;
        this.parentMenu = parentMenu;
        this.plugin = plugin;
    }

    //Load last quiz result UI.
    loadQuizResultUI(){
        try{
            this.ContentEl.empty();
            const resultQuizHeader = this.ContentEl.createEl('div', { text: this.currentQuizName });
            resultQuizHeader.classList.add("quizc-sq-header","inline-title");
            resultQuizHeader.style = "display:flex; justify-content:center;";

            const resultContainer = this.ContentEl.createEl('div');
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
                this.parentMenu.createSelectQuizUI();
                this.activeQuizListPath = this.activeQuizListPath.parent!;
                this.parentMenu.addQuizInsidePath();
            });
        }catch(e){
            
        }
    }

    //Add question button events to UI.
    addQuestionAnswerEvents(){
        try{
            const allWrongAnswers:HTMLElement[] = Array.from(this.ContentEl.querySelectorAll<HTMLElement>(".quizc-wrong"));
            const allCorrectAnswers:HTMLElement[] = Array.from(this.ContentEl.querySelectorAll<HTMLElement>(".quizc-correct"));

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
                        currentT.style = "background:??;".replace("??","var(--quizc-correct-color)");
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
                                correctAnswer.style = "background:??;".replace("??","var(--quizc-correct-color)");
                            }
                        }

                        currentT.style = "background:??;".replace("??","var(--quizc-wrong-color)");
                    }
                });
            }
        }catch(e){
            saveLog(this.plugin,e);
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
            saveLog(this.plugin,e);
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
            saveLog(this.plugin,e);
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
    /*
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
    */

    //Reload current quiz.
    async reloadQuiz(){
        const curretnTagName = this.parentMenu.findFileLikeTag(this.activeQuizListPath.rootName);
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
        if(quizNote != undefined){
            //this.generateQuizWithContent(quizNote);
        }else{
            this.parentMenu.loadMainMenu();
            return;
        }
        this.randomizeQuestions();
        this.createQuizUI(this.currentQuizName);
        this.loadQuestion();
    }

    //Start selected quiz.
    async startQuiz(quizNote:string,quizName:string){
        //this.generateQuizWithContent(quizNote);
        let gQContent= new generateQuizWithContent();
        await gQContent.generateQuizWithContent(quizNote);
        this.questionList = gQContent.questionList.slice();
        this.answerPackages = gQContent.answerPackageList.slice();
        this.randomizeQuestions();
        this.createQuizUI(quizName);
        this.loadQuestion();
    }

    //Load quiz UI.
    createQuizUI(quizName:string){
        try{
            this.ContentEl.empty();
            this.quizEmptyCounter = 0;
            this.quizCorrectCounter = 0;
            this.quizWrongCounter = 0;
            this.currentQuizName = quizName;
            const startQuizHeader = this.ContentEl.createEl('div', { text: this.currentQuizName });
            startQuizHeader.classList.add("quizc-sq-header","inline-title");
            startQuizHeader.style = "display:flex; justify-content:center;";
            startQuizHeader.insertAdjacentHTML('beforeend',"<div id='quizc-correct-answer'>12</div>");
            startQuizHeader.insertAdjacentHTML('beforeend',"<div id='quizc-wrong-answer'>13</div>");

            const quizCorrectL = this.ContentEl.querySelector<HTMLElement>("#quizc-correct-answer");
            if(quizCorrectL)
                this.quizCorrectLabel = quizCorrectL;
            else
                this.quizCorrectLabel = null;

            if(this.quizCorrectLabel)
                this.quizCorrectLabel.innerText = "0";

            const quizWrongL = this.ContentEl.querySelector<HTMLElement>("#quizc-wrong-answer");
            if(quizCorrectL)
                this.quizWrongLabel = quizWrongL;
            else
                this.quizWrongLabel = null;

            if(this.quizWrongLabel)
                this.quizWrongLabel.innerText = "0";
            
            const quizContainer = this.ContentEl.createEl('div');
            quizContainer.id = "quizc-quiz-container";
            quizContainer.insertAdjacentHTML('beforeend',"<div id='quizc-quiz-question'></div>");
            
            const quizQuestionContainerTMP = this.ContentEl.querySelector<HTMLElement>("#quizc-quiz-question");
            if(quizQuestionContainerTMP)
                this.quizQuestionContainer = quizQuestionContainerTMP;
            else
                this.quizQuestionContainer = null;
            
            this.quizAnswerContainer = this.ContentEl.createEl('div');
            this.quizAnswerContainer.id = "quizc-answers-container";

            const nextButtonContainer = this.ContentEl.createEl('div',);
            nextButtonContainer.classList.add("quizc-next-reset-container");
            const nextButton = nextButtonContainer.createEl('button',{text: languageTexts.nextButton});

            const exitButtonContainer = this.ContentEl.createEl('div',);
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
                this.parentMenu.createSelectQuizUI();
                this.activeQuizListPath = this.activeQuizListPath.parent!;
                this.parentMenu.addQuizInsidePath();
            });
        }catch(e){
            saveLog(this.plugin,e);
        }
    }
}