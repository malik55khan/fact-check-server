import express from "express";
import bodyParser from "body-parser";
import { prompt } from "./prompt.js";
import fetch from 'node-fetch'; 
import dotenv from 'dotenv'
import { link } from "fs";
const app = express();
app.use(bodyParser.json());
dotenv.config()
const mySecret = process.env["OPENAI_API_KEY"];
// review from chatgpt
async function main(promptWithSnippet, promptWithSelectedText) {
  const url = "https://api.openai.com/v1/completions"; // OpenAI API endpoint
  // console.log("prompt", prompt.replace("{text}", selectedText));
  const data = {
    model: "gpt-3.5-turbo-instruct",
    prompt: promptWithSnippet || promptWithSelectedText || prompt,
    max_tokens: 500,
    temperature: 0.5,
    top_p: 1,
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mySecret}`,
    },
    body: JSON.stringify(data),
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(data);
    return data.choices[0].text;
  } catch (error) {
    console.log(error);
  }
}
// google search response
async function googleSearch(selectedText) {
  try {
    const cseId = process.env["ENGINE_ID"];
    const apiKey = process.env["ENGINE_API_KEY"];
    const searchTerm = selectedText;
    console.log(apiKey)
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${searchTerm}`;

    const response = await fetch(url);
    const data = await response.json();

    const results = data.items.slice(0, 3); // Get first 3 results
    // Process the results (title, snippet, link)
    const snippetText = results
      .map((result, index) => {
        return `
            source ${index+1}:  ${result.snippet} 
            link: ${result.link}
          `;
      })
      .join("\n");
    return {snippetText,results};
  } catch (error) {
    console.error(error);
    // Handle error appropriately, or re-throw if necessary
  }
}
app.post("/factcheck", async (req, res) => {
  console.log("Selected Text:", req.body.selectedText);

  const {snippetText,results} = await googleSearch(req.body.selectedText);
  let answer="Answer: ",source="",count=1;
  for(let result of results){
    answer+=`${result.snippet}\n\n`
    source+=`Source ${count++}: ${result.link}\n`
  }
  const promptWithSelectedText = prompt.replace(
    "{text}",
    req.body.selectedText,
  );
  // console.log("prompt", promptWithSelectedText);
  const promptWithSnippet = promptWithSelectedText.replace(
    "{google_snippet}",
    answer+source,
  );
  console.log("Final Prompt: ", promptWithSnippet);
  const factResponse = await main(promptWithSnippet, promptWithSelectedText);
  console.log("Response From ChtatGPT", factResponse);
  res.json({ text: factResponse, input:promptWithSnippet, googleSearch: snippetText });
});

app.get("/", (req, res) => {
  res.json({status:"api server working"})
});

app.listen(3000, () => {
  console.log("Express server initialized");
});
