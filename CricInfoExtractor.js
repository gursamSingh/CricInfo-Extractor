// node CricInfoExtractor.js --datafolder=allTeams --excel=Worldcup.csv --source="https://www.espncricinfo.com/series/ipl-2020-21-1210595/match-results"

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let path = require("path");
let fs = require("fs");
const { PDFDocument } = require("pdf-lib");

// download using axios
// extract information using jsdom
// manipulate data using array functions
// save in excel using excel4node
// create folders and prepare pdfs


let args = minimist(process.argv);

let promiseOfHTML = axios.get(args.source);
promiseOfHTML.then(function(response){
    let html = response.data;

    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = []; // array of all the matches which contains an object further which contains all the information of a specific match
    let matchDivs = document.querySelectorAll("div.match-score-block");
    // console.log(matchDivs.length);
    for(let i = 0; i < matchDivs.length; i++){
        let matchDiv = matchDivs[i]; // getting one match div from the array of matchDivs
        let match = { // Match object  defined which contains nameT1, nameT2, scoreT1, scoreT2, result
            nameT1: "",
            nameT2: "",
            scoreT1: "",
            scoreT2: "",
            result: "",
        };

        let teamPara = matchDiv.querySelectorAll("div.name-detail > p.name");
        match.nameT1 = teamPara[0].textContent;
        match.nameT2 = teamPara[1].textContent;


        let scoreSpan = matchDiv.querySelectorAll("div.score-detail  > span.score");
        if(scoreSpan.length == 2){
            match.scoreT1 = scoreSpan[0].textContent;
            match.scoreT2 = scoreSpan[1].textContent;
        } else if (scoreSpan.length == 1){
            match.scoreT1 = scoreSpan[0].textContent;
            match.scoreT2 = "";
        }else{
            match.scoreT1 = "";
            match.scoreT2 = "";
        }

        let resultSpan = matchDiv.querySelector("div.status-text");
        match.result = resultSpan.textContent;

        matches.push(match);
    }
    let teams = []; 


    for(let i = 0; i < matches.length; i++){
        putTeamsInTeamsArrayFromMatch(teams, matches[i]);
        putMatchInTeamsArray(teams, matches[i]);
    }
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON, "utf-8");
    
    
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");

    createExcel(teams);
    createFolder(teams);



}).catch(function(err){
    console.log(err);
})

function putTeamsInTeamsArrayFromMatch(teams, match){
    let team1Index = teams.findIndex(function(team){
        if(team.name == match.nameT1){
            return true;
        }else{
            return false
        }
    })

    if(team1Index == -1){
        let team = {
            name: match.nameT1,
            matches:[]
        }

        teams.push(team)
    }

    let team2Index = teams.findIndex(function(team){
        if(team.name == match.nameT2){
            return true;
        }else{
            return false
        }
    })

    if(team2Index == -1){
        let team = {
            name: match.nameT2,
            matches:[]
        }

        teams.push(team)
    }
}


function putMatchInTeamsArray (teams,match){
    let team1Index = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == match.nameT1){
            team1Index = i;
            break;
        }
    }

    let team1 = teams[team1Index];
    team1.matches.push({
        vs: match.nameT2,
        selfScore: match.scoreT1,
        opponentScore: match.scoreT2,
        result: match.result
    })


    let team2Index = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == match.nameT2){
            team2Index = i;
            break;
        }
    }

    let team2 = teams[team2Index];
    team2.matches.push({
        vs: match.nameT1,
        selfScore: match.scoreT2,
        opponentScore: match.scoreT1,
        result: match.result
    })
}

function createExcel(teams){
    let wb = new excel.Workbook();

    for(let i = 0; i < teams.length; i++){
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1,1).string("VS");
        sheet.cell(1,2).string("Team1");
        sheet.cell(1,3).string("Team2");
        sheet.cell(1,4).string("Result");

        for(let j = 0; j < teams[i].matches.length; j++){
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].opponentScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);

        }
    }

    wb.write(args.excel);


}

function createFolder(teams){
    fs.mkdirSync(args.datafolder);
    for(let i = 0; i < teams.length; i++){
        let teamFolderName = path.join(args.datafolder, teams[i].name);
        fs.mkdirSync(teamFolderName);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFolderName, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }

}

function createScoreCard (teamName, match, matchFileName){
    let team1 = teamName;
    let team2 = match.vs;
    let team1Score = match.selfScore;
    let team2Score = match.opponentScore;
    let result = match.result;

    let OriginalBytes = fs.readFileSync("template.pdf");
    let pdfDocPromise = pdf.PDFDocument.load(OriginalBytes);
    pdfDocPromise.then(function(pdfdoc){
        let pages = pdfdoc.getPages(0);
        pages[0].drawText(team1, {
            x: 300,
            y: 760,
            size: 11
        });

        pages[0].drawText(team2, {
            x: 300,
            y: 730,
            size: 11
        });

        pages[0].drawText(team1Score, {
            x: 300,
            y: 710,
            size: 11
        });

        pages[0].drawText(team2Score, {
            x: 300,
            y: 690,
            size: 11
        });

        pages[0].drawText(result, {
            x: 300,
            y: 670,
            size: 11
        });

        let finalPDFBytesPromise = pdfdoc.save();
        finalPDFBytesPromise.then(function(finaPDFBytes){
            fs.writeFileSync(matchFileName, finaPDFBytes);
        })
    })
    

}