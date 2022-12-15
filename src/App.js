import { useState } from "react";
import "./App.css";

function App() {
    const [text, setText] = useState("");

    const onChange = (ev) => {
        setText(ev.target.value);
    }

    const saveHandler = () => {
        localStorage.setItem('text', text);
    }

    const resetHandler = () => {
        setText("");
    }

    return (
        <div className="App">
            <div className="box">
                <div className="field">
                    <div className="control">
                        <textarea className="textarea is-large" value={text} placeholder="Notes..." onChange={(ev) => onChange(ev)} />
                    </div>
                </div>
                <button className="button is-large is-primary is-active" onClick={saveHandler}>Save</button>
                <button className="button is-large" onClick={resetHandler}>Clear</button>
            </div>
        </div>
    );
}

export default App;
