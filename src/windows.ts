import {
	Modal,
    ItemView,
    WorkspaceLeaf,
    App
} from 'obsidian';
import {TAB_NAME} from './main';

export class QuizTab extends ItemView{
    quizCreatorisOpen: boolean = false;
    
    constructor(leaf:WorkspaceLeaf){
        super(leaf);
    }
    
    getViewType(): string {
        return TAB_NAME;
    }

    getDisplayText(): string {
        return "QUIZ TAB";
    }

    async onOpen(){
        this.quizCreatorisOpen = true;        
    }
    
    async onClose(){
        this.quizCreatorisOpen = false;
    }
}

export class QuizModal extends Modal{
    
    constructor(app:App){
        super(app);
        this.modalEl.classList.add("quizc-modal-class");
    }

    onClose(){
    
    }
}