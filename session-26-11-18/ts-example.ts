let person_name: string = "Mr. Anderson";
let greet_person: boolean = true;
let current_date: Date = new Date();

type person_count_type = number | undefined;
let person_count: person_count_type;

person_count = 1;

// example: comparison operators
// if (person_count == "1") { // in JS, not TS, the "==" compares value only
//    console.log(`person count is 1`)
//}

if (person_count === 1) {     // in JS/TS, the "===" compares value and type
    console.log(`person count is 1`)
} 

// example: casting an unkown type variable
let unknown_date: unknown = current_date;
if (typeof unknown_date === "object") {
    let date_cast: Date = <Date>unknown_date;
    console.log(`Today is ${date_cast.toDateString()}!`);
}

greet(person_name, current_date);
greetGeneric(person_name, current_date);

function greet(person: string, date: Date) : void {
 console.log(`Hello ${person}, today is ${date.toDateString()}!`);
}

function greetGeneric<S,T>(p1: S, p2: T) : void {
 console.log(`Parameter one, to string: ${p1}, parameter two, to string: ${p2})}!`);
 let my_objects_s : S[] = [ p1 ]
 let my_objects_p : T[] = [ p2 ]

  // example, if this is always a date (only as example for casting, not applicable here):
  // let date_cast = <Date>p2;  
  // console.log(` today is ${date_cast.toDateString()}!`)
  // example, generic
}
