/* eslint-disable no-unused-vars */
import "./index.scss";

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanRound, WebSocketEvents } from "@typings";
import Store from "frontend/Store";
import { createSignal, For } from "solid-js";
// import { Show } from "solid-js";

const QuestionManager = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    // TODO: Figure out if the User is in a game or not
    // const game = false; // not

    const [questions, setQuestions] = createSignal<CleanRound[]>([]);
    const [newQuestion, setNewQuestion] = createSignal<CleanRound>({
        type: "buzzer",
        number: 0,
        question: "",
    });

    const addQuestion = () => {
        setQuestions([...questions(), newQuestion()]);
        setNewQuestion({
            type: "buzzer",
            number: 0,
            question: "",
        }); // Reset content and type
    };

    const [selectedFile, setSelectedFile] = createSignal(null);

    // todo: does not work yet
    // todo: scss grid full screen size
    // todo: delete button
    const handleFileChange = event => {
        const file = event.target.files[0];
        setSelectedFile(file);

        const reader = new FileReader();
        reader.onload = () => {
            const contents = reader.result as string;
            const newQuestions = JSON.parse(contents);

            const parsedQuestions = newQuestions.map(question => {
                let parsedQuestion;
                switch (question.type) {
                    case "buzzer":
                        parsedQuestion = {
                            type: "buzzer",
                            number: question.number,
                            question: question.question,
                        };
                        break;
                    case "choice":
                        parsedQuestion = {
                            type: "choice",
                            number: question.number,
                            question: question.question,
                            choices: question.choices,
                        };
                        break;
                    case "estimate":
                        parsedQuestion = {
                            type: "estimate",
                            number: question.number,
                            question: question.question,
                            min: question.min,
                            max: question.max,
                        };
                        break;
                    default:
                        parsedQuestion = null;
                        break;
                }
                return parsedQuestion;
            });

            setQuestions([...questions(), ...parsedQuestions]);

            store().Socket.send({
                event: WebSocketEvents.SETUP_ROUNDS,
                data: {
                    rounds: questions()
                }
            });
        };
        reader.readAsText(file);
    };

    return (
        <>
            <div class="question-manager"> {/* Apply the theme-dark class */}
                <div class="question-grid">
                    <div class="question-box">
                        <div class="file-upload">
                            <input
                                type="file"
                                id="file-input"
                                accept=".ls.json"  // Define the accepted file types
                                style={{"display":"none"}}  // Hide the default file input
                                onChange={handleFileChange}
                            />
                            <label for="file-input" class="custom-file-input">
                                {selectedFile() ? `Selected: ${selectedFile().name}` : "Choose a file"}
                            </label>
                        </div>
                    </div>
                    <For each={questions()}>
                        {(question, index) => (
                            <div class="question-box">
                                {question.question}
                            </div>
                        )}
                    </For>
                    {/* <div class="add-question-box">
                        <input
                            type="text"
                            placeholder="Type your question"
                            value={newQuestion().question}
                            onInput={e => setNewQuestion({ ...newQuestion(), content: e.target.value })}
                        />
                        <select
                            value={newQuestion().type}
                            onChange={e => setNewQuestion({ ...newQuestion()  })}
                        >
                            <option value="BUZZER">Buzzer</option>
                            <option value="EST">Sch&auml;tzen</option>
                            <option value="CHOICE">Auswahl</option>
                        </select>
                        <button onClick={addQuestion}>Add</button>
                    </div> */}
                </div>
            </div>
        </>
    );
};
export default QuestionManager;
