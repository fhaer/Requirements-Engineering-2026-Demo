"use strict";
let person_name = "Mr. Anderson";
let greet_person = true;
let current_date = new Date();
let person_count;
person_count = 1;
// example: comparison operators
// if (person_count == "1") { // in JS, not TS, the "==" compares value only
//    console.log(`person count is 1`)
//}
if (person_count === 1) { // in JS/TS, the "===" compares value and type
    console.log(`person count is 1`);
}
// example: casting an unkown type variable
let unknown_date = current_date;
if (typeof unknown_date === "object") {
    let date_cast = unknown_date;
    console.log(`Today is ${date_cast.toDateString()}!`);
}
greet(person_name, current_date);
greetGeneric(person_name, current_date);
function greet(person, date) {
    console.log(`Hello ${person}, today is ${date.toDateString()}!`);
}
function greetGeneric(p1, p2) {
    console.log(`Parameter one, to string: ${p1}, parameter two, to string: ${p2})}!`);
    let my_objects_s = [p1];
    let my_objects_p = [p2];
    // example, if this is always a date (only as example for casting, not applicable here):
    // let date_cast = <Date>p2;  
    // console.log(` today is ${date_cast.toDateString()}!`)
    // example, generic
}
