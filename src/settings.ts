import {
    App,
    PluginSettingTab,
    IconName,
} from 'obsidian';

import QuizCreator from './main';
import {QuizTab,QuizModal} from './windows';

export class appSettingTab extends PluginSettingTab{
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

    quizcSettings!:appSetting;

    defaultSetting:appSetting = {
                        selectQuestionButtonWidth  :"200px",
                        nextResetExitButtonWidth   :"100px",
                        selectQuestionElementMargin:"5px",
                        correctColor               :"#32CD32",
                        wrongColor                 :"#FF2C2C",
                        quizMenuElementWidth       :"65%",
                        quizMenuElementMargin      :"10px",
                        language                   :"en",
                        externalTab                :"false"
                    };

    isCreated:boolean = false;

    externalTab!:QuizTab;
    quizModal!:QuizModal;

    constructor(app:App,plugin:QuizCreator){
        super(app,plugin);
        this.plugin = plugin;
        this.icon = "quizc-icon";
    }

    setInputValues(){
        this.selectQuestionButtonWidthInput.value   = this.quizcSettings.selectQuestionButtonWidth;
        this.generalNavigationButtonWidth.value     = this.quizcSettings.nextResetExitButtonWidth;
        this.selectQuestionButtonMarginInput.value  = this.quizcSettings.selectQuestionElementMargin;
        this.quizMenuElementsMarginInput.value      = this.quizcSettings.quizMenuElementMargin;
        this.quizMenuAnswerWidthInput.value         = this.quizcSettings.quizMenuElementWidth;
        this.languageDropdownInput.value            = this.quizcSettings.language;
        this.openExternalTabInput.value             = this.quizcSettings.externalTab;
        this.correctColorInput.value                = this.quizcSettings.correctColor;
        this.wrongColorInput.value                  = this.quizcSettings.wrongColor;
    }

    setDefaultSetting(){
        this.quizcSettings.selectQuestionButtonWidth    = this.defaultSetting.selectQuestionButtonWidth;
        this.quizcSettings.nextResetExitButtonWidth     = this.defaultSetting.nextResetExitButtonWidth;
        this.quizcSettings.selectQuestionElementMargin  = this.defaultSetting.selectQuestionElementMargin;
        this.quizcSettings.correctColor                 = this.defaultSetting.correctColor;
        this.quizcSettings.wrongColor                   = this.defaultSetting.wrongColor;
        this.quizcSettings.quizMenuElementWidth         = this.defaultSetting.quizMenuElementWidth;
        this.quizcSettings.quizMenuElementMargin        = this.defaultSetting.quizMenuElementMargin;
        this.quizcSettings.externalTab                  = this.defaultSetting.externalTab;
        this.quizcSettings.language                     = this.defaultSetting.language;

        this.plugin.settings = this.quizcSettings;
    }

    createElements(){
        this.containerEl.empty();

        const settingGroup = this.containerEl.createDiv();
        settingGroup.classList.add("setting-group");
        
        const settingItems = settingGroup.createDiv();
        settingItems.classList.add("setting-items");

        const languageDropdownContainer = settingItems.createDiv();
        languageDropdownContainer.classList.add("setting-item");
        languageDropdownContainer.createSpan({text:"Question Button Width"}).style = "margin-right:5px; width:175px;";
        languageDropdownContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><select class='dropdown' style='--dropdown-fitted-width: 175px;'>"+
                                                                 "<option value='tr'>Türkçe</option>"+
                                                                 "<option value='en'>English</option>"+
                                                                 "</select></div>");
        this.languageDropdownInput = languageDropdownContainer.lastChild?.lastChild as HTMLInputElement;
        this.languageDropdownInput.value = this.plugin.settings.language;
        this.languageDropdownInput.addEventListener('change',()=>{
            this.quizcSettings.language = this.languageDropdownInput.value;
            this.plugin.settings = this.quizcSettings;
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });

        const openExternalTabContainer = settingItems.createDiv();
        openExternalTabContainer.classList.add("setting-item");
        openExternalTabContainer.createSpan({text:"Open External Tab"}).style = "margin-right:5px; width:175px;";
        openExternalTabContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><label class='checkbox-container'><input type='checkbox'></label></div>");
        this.openExternalTabLabel = openExternalTabContainer.lastChild?.firstChild as HTMLLabelElement;
        this.openExternalTabInput = this.openExternalTabLabel.lastChild as HTMLInputElement;
        this.openExternalTabInput.value = this.quizcSettings.externalTab;
        if(this.quizcSettings.externalTab == "true"){
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

            this.quizcSettings.externalTab = this.openExternalTabInput.value;
            this.plugin.settings = this.quizcSettings;

            if(this.quizModal){
                this.quizModal.close();
            }
            
            if(this.externalTab){
                this.externalTab.leaf.detach();
            }
        });

        const selectQuestionButtonWidthConainer = settingItems.createDiv();
        selectQuestionButtonWidthConainer.classList.add("setting-item");
        selectQuestionButtonWidthConainer.createSpan({text:"Question Button Width"}).style = "margin-right:5px; width:175px;";
        selectQuestionButtonWidthConainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><input type='text'></div>");
        (selectQuestionButtonWidthConainer.lastChild?.lastChild as HTMLInputElement).value = this.quizcSettings.selectQuestionButtonWidth;
        this.selectQuestionButtonWidthInput = selectQuestionButtonWidthConainer.lastChild?.lastChild as HTMLInputElement;
        this.selectQuestionButtonWidthInput.addEventListener('change',()=>{
            this.quizcSettings.selectQuestionButtonWidth = this.selectQuestionButtonWidthInput.value;
            this.plugin.settings = this.quizcSettings;
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });

        const selectQuestionButtonMarginContainer = settingItems.createDiv();
        selectQuestionButtonMarginContainer.classList.add("setting-item");
        selectQuestionButtonMarginContainer.createSpan({text:"Select Question Button Margin"}).style = "margin-right:5px; width:175px;";
        selectQuestionButtonMarginContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><input type='text'></div>");
        (selectQuestionButtonMarginContainer.lastChild?.lastChild as HTMLInputElement).value = this.quizcSettings.selectQuestionElementMargin;
        this.selectQuestionButtonMarginInput = selectQuestionButtonMarginContainer.lastChild?.lastChild as HTMLInputElement;
        this.selectQuestionButtonMarginInput.addEventListener('change',()=>{
            this.quizcSettings.selectQuestionElementMargin = this.selectQuestionButtonMarginInput.value;
            this.plugin.settings = this.quizcSettings;          
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });

        const quizMenuElementsMarginContainer = settingItems.createDiv();
        quizMenuElementsMarginContainer.classList.add("setting-item");
        quizMenuElementsMarginContainer.createSpan({text:"Quiz Element Margin"}).style = "margin-right:5px; width:175px;";
        quizMenuElementsMarginContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><input type='text'></div>");
        (quizMenuElementsMarginContainer.lastChild?.lastChild as HTMLInputElement).value = this.quizcSettings.quizMenuElementMargin;
        this.quizMenuElementsMarginInput = quizMenuElementsMarginContainer.lastChild?.lastChild as HTMLInputElement;
        this.quizMenuElementsMarginInput.addEventListener('change',()=>{
            this.quizcSettings.quizMenuElementMargin = this.quizMenuElementsMarginInput.value;
            this.plugin.settings = this.quizcSettings;
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });
        
        const quizMenuAnswerWidthContainer = settingItems.createDiv();
        quizMenuAnswerWidthContainer.classList.add("setting-item");
        quizMenuAnswerWidthContainer.createSpan({text:"Quiz Element Width"}).style = "margin-right:5px; width:175px;";
        quizMenuAnswerWidthContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><input type='text'></div>");
        (quizMenuAnswerWidthContainer.lastChild?.lastChild as HTMLInputElement).value = this.quizcSettings.quizMenuElementWidth;
        this.quizMenuAnswerWidthInput = quizMenuAnswerWidthContainer.lastChild?.lastChild as HTMLInputElement;
        this.quizMenuAnswerWidthInput.addEventListener('change',()=>{
            this.quizcSettings.quizMenuElementWidth = this.quizMenuAnswerWidthInput.value;
            this.plugin.settings = this.quizcSettings;
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });

        const generalNavigationButtonContainer = settingItems.createDiv();
        generalNavigationButtonContainer.classList.add("setting-item");
        generalNavigationButtonContainer.createSpan({text:"Navigation Buttons Width"}).style = "margin-right:5px; width:175px;";
        generalNavigationButtonContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><input type='text'></div>");
        (generalNavigationButtonContainer.lastChild?.lastChild as HTMLInputElement).value = this.quizcSettings.nextResetExitButtonWidth;
        this.generalNavigationButtonWidth = generalNavigationButtonContainer.lastChild?.lastChild as HTMLInputElement;
        this.generalNavigationButtonWidth.addEventListener('change',()=>{
            this.quizcSettings.nextResetExitButtonWidth = this.generalNavigationButtonWidth.value;
            this.plugin.settings = this.quizcSettings;
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });

        const pickCorrectColorContainer = settingItems.createDiv();
        pickCorrectColorContainer.classList.add("setting-item");
        pickCorrectColorContainer.createSpan({text:"Correct Color"}).style = "margin-right:5px; width:92px;";
        pickCorrectColorContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><input type='color'></div>");
        (pickCorrectColorContainer.lastChild?.lastChild as HTMLInputElement).value = this.quizcSettings.correctColor;
        this.correctColorInput = pickCorrectColorContainer.lastChild?.lastChild as HTMLInputElement;
        this.correctColorInput.addEventListener('change',()=>{
            this.quizcSettings.correctColor = this.correctColorInput.value;
            this.plugin.settings = this.quizcSettings;
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });

        const pickWrongColorContainer = settingItems.createDiv();
        pickWrongColorContainer.classList.add("setting-item");
        pickWrongColorContainer.createSpan({text:"Wrong Color"}).style = "margin-right:5px; width:92px;";
        pickWrongColorContainer.insertAdjacentHTML('beforeend',"<div class='setting-item-control'><input type='color'></div>");
        (pickWrongColorContainer.lastChild?.lastChild as HTMLInputElement).value = this.quizcSettings.wrongColor;
        this.wrongColorInput = pickWrongColorContainer.lastChild?.lastChild as HTMLInputElement;
        this.wrongColorInput.addEventListener('change',()=>{
            this.quizcSettings.wrongColor = this.wrongColorInput.value;
            this.plugin.settings = this.quizcSettings;
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });

        const resetButtonContainer = settingItems.createDiv();
        resetButtonContainer.classList.add("setting-item");
        const resetButton = resetButtonContainer.createEl('button',{text:"Reset"});
        resetButton.style = "display:flex; align-items:center; justify-content:left; margin-top:10px;";
        resetButton.addEventListener('click',()=>{
            this.setDefaultSetting();
            this.setInputValues();
            this.plugin.saveSettings();
            this.applySettings();
            this.display();
        });    
        
        this.isCreated = true;
    }

    display(): void {
        if(!this.isCreated)
            this.createElements();
        else
            this.applySettings();
    }

    addSetting(quizcSettings:appSetting){
        this.quizcSettings = quizcSettings;
    }

    setExternalTab(externalTab:QuizTab){
        this.externalTab = externalTab;
        this.applySettings();
    }

    setModal(quizModal:QuizModal){
        this.quizModal = quizModal;
        this.applySettings();
    }

    applySettings(){
        if(this.quizcSettings.externalTab === "false"){
            document.documentElement.style.setProperty("--quizc-selectQ-button-width",this.quizcSettings.selectQuestionButtonWidth);
            document.documentElement.style.setProperty("--quizc-next-reset-exit-button-width",this.quizcSettings.nextResetExitButtonWidth);
            document.documentElement.style.setProperty("--quizc-selectq-button-margin",this.quizcSettings.selectQuestionElementMargin);
            document.documentElement.style.setProperty("--quizc-correct-color",this.quizcSettings.correctColor);
            document.documentElement.style.setProperty("--quizc-wrong-color",this.quizcSettings.wrongColor);
            document.documentElement.style.setProperty("--quizc-quiz-answer-with",this.quizcSettings.quizMenuElementWidth);
            document.documentElement.style.setProperty("--quizc-quiz-button-margin",this.quizcSettings.quizMenuElementMargin);
        }else{
            if(!this.externalTab) return;
            this.externalTab.contentEl.ownerDocument.documentElement.style.setProperty("--quizc-selectQ-button-width",this.quizcSettings.selectQuestionButtonWidth);
            this.externalTab.contentEl.ownerDocument.documentElement.style.setProperty("--quizc-next-reset-exit-button-width",this.quizcSettings.nextResetExitButtonWidth);
            this.externalTab.contentEl.ownerDocument.documentElement.style.setProperty("--quizc-selectq-button-margin",this.quizcSettings.selectQuestionElementMargin);
            this.externalTab.contentEl.ownerDocument.documentElement.style.setProperty("--quizc-correct-color",this.quizcSettings.correctColor);
            this.externalTab.contentEl.ownerDocument.documentElement.style.setProperty("--quizc-wrong-color",this.quizcSettings.wrongColor);
            this.externalTab.contentEl.ownerDocument.documentElement.style.setProperty("--quizc-quiz-answer-with",this.quizcSettings.quizMenuElementWidth);
            this.externalTab.contentEl.ownerDocument.documentElement.style.setProperty("--quizc-quiz-button-margin",this.quizcSettings.quizMenuElementMargin);
        }
    }

    hide(): void {
        
    }
}

export interface appSetting{
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

export interface languageText{
    nextButton:string,
    exitButton:string,
    reloadButton:string,
    selectQuizText:string,
    resulText:string,
    correctText:string,
    wrongText:string,
    emptyText:string
}

