export const profiles = {
    userId: "int8",
    role: "text", //lender, borrower, admin
    code: "text",
    // personal info fields
    surname: "text",
    firstname: "text",
    middlename: "text",
    dateofbirth: "text",
    gender: "text",
    maritalstatus: "text",
    email: "text",
    mobile: "text",
    occupation: "text",
    placeofwork: "text",
    //additional info fields
    nationality: "text",
    accountnumber: "text",
    accountname: "text",
    bankname: "text",
    address: "text",
}
export const users = {
    role: "text", //lender, borrower, superadmin
    failed: "int",
    failedMax: "int",
    surname: "text",
    firstname: "text",
    username: "text",
    password: "text",
    mobile: "text",
    email: "text",
}

export const loanfinances = {
    userId: "int8",
    profileId: "int8",
    title: "text",
    percentage: "int8",
    amount: "text",
    duration: "text"
}
export const loans = {
    loanfinanceId: "int8",
    userId: "int8",
    profileId: "int8",
    expirydate: "timestamp",
    amount: "text",
}

