export const nextofkins = {
    code: "text",
    driverId: "int8",
    nextofkinId: "int8",
    relationship: "text",
    occupation: "text",
    address: "text",
    tableindex: ["code", "driverid", "nextofkinid", "relationship"]
}

export const guarantors = {
    code: "text",
    driverId: "int8",
    guarantorId: "int8",
    relationship: "text",

    //guarantor fields
    position: 'text',
    occupation: 'text',
    placeofwork: 'text',
    officeaddress: 'text',


    tableindex: ["code", "driverid", "guarantorid", "relationship", "position", "occupation", "placeofwork", "officeaddress"]
}

export const transporter = {
    code: "text",
    driverId: "int8",
    representativeId: "int8",
    businessname: "text",
    address: "text",
    mobile: "text",
    email: "text",

    tableindex: ["code", "businessname", "representativeid", "email", "mobile", "address"]
}

export const transporterreps = {
    code: "text",
    transporterId: "int8",
    transporterrepId: "int8",

    //partner fields
    position: 'text',
    occupation: 'text',

    tableindex: ["code", "transporterid", "position", "occupation"]
}

export const transporterdrivers = {
    code: "text",
    representativeId: "int8",
    transporterId: "int8",

    //partner fields
    position: 'text',
    occupation: 'text',
    placeofwork: 'text',
    officeaddress: 'text',

    tableindex: ["code", "transporterid", "representativeid", "relationship", "position", "occupation", "placeofwork", "officeaddress"]
}

export const contacts = {
    surname: "text",
    firstname: 'text',
    middlename: 'text',
    email: "text",
    mobile: "text",
    occupation: "text",
    email2: "text",
    mobile2: "text",
    profileId: "int8",

    house: "text",
    street: "text",
    area: "text",
    city: "text",
    state: "text",
    region: "text",
    country: "text",
    tableindex: ["surname", "firstname", "middlename", "email", "mobile", "street", "city", "area", "state", "region", "country"]
}


export const bankdetails = {
    code: "text",
    bank: "text",
    name: "text",
    number: "text",
    iban: "text",
    ifsc: "text",
    upid: "text",
    swiftcode: "text",
    driverId: "int8",
    verifiedby: "int8",
    statuscomments: "text",

    // wallet information
    bankTag: "text",
    walletAccountName: "text",
    walletAccountNumber: "text",
    walletBankName: "text",
    walletBankCode: "text",

    tableindex: ["bank", "name", "number", "driverId"]
}

export const documents = {
    code: "text",
    name: "text",
    profileId: "int8",
    doctypeId: "int8",

    filename: "text",
    filemeta: "text",
    filetype: "text",
    filepath: "text",
    filesize: "int8",

    issuedby: "text",
    issuedto: "text",
    issuedon: "date",
    validtill: "date",

    reftable: "text",
    reftableId: "int8",

    tableindex: ["code", "name", "profileid", "doctypeid", "filename", "filepath", "issuedby", "validtill"]
}

// last is profile
export const profiles = {

    productId: "int8", //needed 
    transporterId: "int8",
    userId: "int8",
    role: "text", //employee, driver, guarantor, nextofkin
    code: "text",

    image: "text",

    // personal info fields
    surname: "text",
    firstname: "text",
    middlename: "text",
    dateofbirth: "text",
    gender: "text",
    maritalstatus: "text",
    email: "text",
    mobile: "text",
    secondarymobile: "text",
    mobilesocial: "bool",
    secondarymobilesocial: "bool",


    personalstatus: "text",
    personalcomment: "text",

    additionalstatus: "text",
    additionalcomment: "text",

    //additional info fields
    nationality: "text",

    townoforiginId: "int8",
    cityareaoforiginId: "int8",
    regionstateoforiginId: "int8",

    townofresidenceId: "int8",
    cityareaofresidenceId: "int8",
    regionstateofresidenceId: "int8",
    rentalexpirydate: "text",

    postcode: "text",
    address: "text",
    edulevel: "text",
    shoesize: "text",
    referrer: "text",
    religion: "text",
    citizenid: "text",

    tableindex: ["surname", "role", "address", "userid", "email", "mobile", "dateofbirth", "gender", "edulevel", "shoesize", "referrer", "religion"],
    tableunique: ["code"]
}

//  profile update history
export const profilesupdatehistory = {

    productId: "int8", //needed 
    transporterId: "int8",
    userId: "int8",
    role: "text", //employee, driver, guarantor, nextofkin
    code: "text",

    image: "text",

    // personal info fields
    surname: "text",
    firstname: "text",
    middlename: "text",
    dateofbirth: "text",
    gender: "text",
    maritalstatus: "text",
    email: "text",
    mobile: "text",
    secondarymobile: "text",
    mobilesocial: "bool",
    secondarymobilesocial: "bool",


    personalstatus: "text",
    personalcomment: "text",

    additionalstatus: "text",
    additionalcomment: "text",

    //additional info fields
    nationality: "text",

    townoforiginId: "int8",
    cityareaoforiginId: "int8",
    regionstateoforiginId: "int8",

    townofresidenceId: "int8",
    cityareaofresidenceId: "int8",
    regionstateofresidenceId: "int8",
    rentalexpirydate: "text",

    postcode: "text",
    address: "text",
    edulevel: "text",
    shoesize: "text",
    referrer: "text",
    religion: "text",

    tableindex: ["surname", "role", "address", "userid", "email", "mobile", "dateofbirth", "gender", "edulevel", "shoesize", "referrer", "religion"],
}


//license number will be stored in the code field of driverlicenses table
export const driverlicenses = {
    code: "text",
    name: "text",
    profileId: "int8",

    issuedby: "text",
    issuedto: "text",
    checkcode: "text",
    insurancenumber: "text",
    issuedon: "date",
    expirydate: "date",
    verifiedby: "int8",
    statuscomments: "text",

    tableindex: ["code", "name", "profileid", "issuedby", "issuedto", "issuedon", "expirydate", "statuscomments"]
}

export const nationalids = {
    code: "text",
    name: "text",
    profileId: "int8",

    issuedby: "text",
    issuedto: "text",
    issuedon: "date",
    expirydate: "date",
    verifiedby: "int8",
    statuscomments: "text",

    tableindex: ["code", "name", "profileid", "issuedby", "issuedto", "issuedon", "expirydate", "statuscomments"]
}

export const passportids = {
    code: "text",
    name: "text",
    profileId: "int8",

    issuedby: "text",
    issuedto: "text",
    issuedon: "date",
    expirydate: "date",
    verifiedby: "int8",
    statuscomments: "text",

    tableindex: ["code", "name", "profileid", "issuedby", "issuedto", "issuedon", "expirydate", "statuscomments"]
}
export const visaids = {
    code: "text",
    name: "text",
    profileId: "int8",

    issuedby: "text",
    issuedto: "text",
    issuedon: "date",
    expirydate: "date",
    verifiedby: "int8",
    statuscomments: "text",

    tableindex: ["code", "name", "profileid", "issuedby", "issuedto", "issuedon", "expirydate", "statuscomments"]
}