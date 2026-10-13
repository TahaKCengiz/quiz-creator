export class answerPackage{
    answers:answer[];
    packageName:string;

    constructor(packageName?:string,answers?:answer[]){
        if(answers)
            this.answers = answers;
        else
            this.answers = [];

        if(packageName)
            this.packageName = packageName;
        else
            this.packageName = "";
    }

    addAnswer(answ:answer){
        this.answers.push(answ);
    }

    setPackageName(name:string){
        this.packageName = name;
    }

    reset(){
        this.packageName = "";
        this.answers = [];
    }

    isOk():boolean{
        if(this.packageName != "" && this.answers.length > 0){
            return true;
        }else{
            return false;
        }
    }
}

export class answer{
    isCorrect:boolean;
    answerText:string;
    

    constructor(answerText:string,isCorrect:boolean){
        this.isCorrect = isCorrect;
        this.answerText = answerText;
    }
}

export class question{
    questionText:string;
    questionAnswers:answer[];
    correctAnswerCount:number;
    wrongAnswerPackage:string;
    wantedWrongAnswersCount!:number;
    
    constructor(questionText?:string,answers?:answer[],wantedWrongAnswersCount?:number,wrongAnswerPackage?:string){
        if(questionText)
            this.questionText = questionText;
        else
            this.questionText = "";

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

    setQuestionText(questionText:string){
        this.questionText = questionText;
    }

    setWantedWrongAnswerC(count:number){
        this.wantedWrongAnswersCount = count;
    }

    setWrongAnswerPackage(packageName:string){
        this.wrongAnswerPackage = packageName;
    }

    addAnswer(answer_:answer){
        if(answer_.isCorrect)
            this.correctAnswerCount++;
        this.questionAnswers.push(answer_);
    }

    isOk():boolean{
        if(this.questionText != "" && this.questionAnswers.length > 0 && this.correctAnswerCount > 0){
            return true;
        }else{
            return false;
        }
    }

    reset(){
        this.questionText = "";
        this.wrongAnswerPackage = "";
        this.wantedWrongAnswersCount = 0;
        this.correctAnswerCount = 0;
        this.questionAnswers = [];
    }
}

export class generateQuizWithContent{ 
    currentQ:question = new question();
    questionList:question[] = [];

    currentPackage:answerPackage = new answerPackage();
    answerPackageList:answerPackage[] = [];

    constructor(){}

    findState = {
        questionActive:     false,
        correctAnswer:      false,
        wrongAnswer:        false,
        wrongAnswerPackage: false,
        questionSetting:    false
    };

    resetStates(){
        this.findState.questionActive       = false;
        this.findState.correctAnswer        = false;
        this.findState.wrongAnswer          = false;
        this.findState.wrongAnswerPackage   = false;
        this.findState.questionSetting      = false;
    }

    allStateOff():boolean{
        if(this.findState.correctAnswer == false &&
           this.findState.wrongAnswer == false &&
           this.findState.wrongAnswerPackage == false &&
           this.findState.questionSetting == false &&
           this.findState.questionActive == false){
            return true;
        }else{
            return false;
        }
    }

    checkState(content:string){
        if(this.findState.questionActive){
            if(this.findState.correctAnswer){
                if(content != "")
                    this.currentQ.addAnswer(new answer(content,true));
                this.findState.correctAnswer = false;
            }else if(this.findState.wrongAnswer){
                if(content != "")
                    this.currentQ.addAnswer(new answer(content,false));
                this.findState.wrongAnswer = false;
            }
        }else if(this.findState.wrongAnswerPackage){
            if(content != "")
                this.currentPackage.addAnswer(new answer(content,false));
            this.findState.wrongAnswer = false;
            this.findState.correctAnswer = false;
        }else if(this.findState.questionSetting){
            const settingList = (content.substring(2,content.length-1)).split(",");
            if(settingList[0])
                this.currentQ.setWantedWrongAnswerC(Number(settingList[0]));
            if(settingList[1])
                this.currentQ.setWrongAnswerPackage(settingList[1]);
            this.findState.questionSetting = false;
        }
    }

    async generateQuizWithContent(text:string){
        let content:string = "";
        
        this.questionList = [];
        this.currentQ.reset();
        this.resetStates();

        this.answerPackageList = [];
        this.currentPackage.reset();
        
        let lines = text.split("\n");
        lines.splice(0,1);

        for(const line of lines){
            if(line != ""){
                const checkCharacter = line.substring(0,2);
                switch(checkCharacter){
                    case "??":
                        this.checkState(content);
                        this.findState.correctAnswer = true;
                        content = line.replace("??","");
                        break;
                    case "(!":
                        this.currentQ.reset();
                        this.findState.questionSetting = true;
                        this.checkState(line);
                        content = "";
                        break;
                    default:
                        if(line.match(new RegExp('^\\?'))){
                            this.checkState(content);
                            this.findState.wrongAnswer = true;
                            content = line.replace("?","");
                        }else if(line.match(new RegExp('^#quizc-package\\/'))){
                            this.resetStates();
                            this.currentPackage.reset();
                            this.findState.wrongAnswerPackage = true;
                            this.currentPackage.setPackageName(line.replace("#quizc-package/",""));
                            content = "";
                        }else{
                            if(this.allStateOff()){
                                this.currentQ.questionAnswers = [];
                                this.currentQ.questionText = "";
                                this.currentQ.correctAnswerCount = 0;
                                this.findState.questionActive = true;
                                this.currentQ.setQuestionText(line);
                                content = line;                 
                            }else{
                                content += line;
                            }
                        }
                }
                
            }else{
                this.checkState(content);
                if(this.findState.wrongAnswerPackage){
                    if(this.currentPackage.isOk()){
                        this.answerPackageList.push(this.currentPackage);
                    }
                }else{
                    if(this.currentQ.isOk()){
                        this.questionList.push(this.currentQ);
                    }
                }
                
                this.resetStates();
                this.currentPackage = new answerPackage();
                this.currentQ = new question();
                content = "";
            }
        }
        this.checkState(content);
        if(this.findState.wrongAnswerPackage){
            if(this.currentQ.isOk()){
                this.answerPackageList.push(this.currentPackage);
            }
        }else{
            if(this.currentQ.isOk()){
                this.questionList.push(this.currentQ);
            }
        }
    }
}