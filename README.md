# Quiz Creator

You can create a multiple choice quiz in Obsidian.

<img width="400" height="312" alt="ezgif-351b6d4831e226ce" src="https://raw.githubusercontent.com/TahaKCengiz/quiz-creator/refs/heads/main/Plugin%20Gif.gif" />

## HOW TO USE

- Start the note with a #quizc/ tag and add your quiz path after it.
  Example: #quizc/Itanbul/Citys

- Write the question normally.

- Add wrong answers below the question using ?.

- Add correct answers using ??.

  ```text
  What is the capital of Turkey?
  ? Istanbul
  ? Izmir
  ?? Ankara

- Leave an empty line after the question to finish it.

- You can add question settings using:
  (!wrongAnswerCount,packageName)

- The first setting is how many wrong answers should be used.

- The second setting is the [wrong answer package](#how-to-create-wrong-answer-package) name.

  ```text
  (!3,cities)
  What is the capital of Turkey?
  ?? Ankara
  ? Istanbul
  ? Izmir

## HOW TO CREATE WRONG ANSWER PACKAGE

- To create a wrong answer package, use:
  #quizc-package/packageName

- Package names cannot contain paths. Use only a direct name.

- Add package answers using ?.

  ```text
  #quizc-package/cities
  ? Istanbul
  ? Izmir
  ? Bursa
  ? Antalya

- Leave an empty line to finish the package.
