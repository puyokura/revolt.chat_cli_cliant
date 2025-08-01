import 'inquirer';

declare module 'inquirer' {
  interface QuestionMap<T> {
    command: Question<T> & {
      autoCompletion?: string[];
    };
    'file-tree-selection': Question<T> & {
      root?: string;
    };
  }
}
