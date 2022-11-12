import { transporter as mailSender } from "../../config/utils.js"
import MailTemplates from "../../config/mail/index.js"

const Handler = {
    sendMail: async (msg) => {
        if (msg.html !== undefined) {
            try {
                await mailSender.sendMail(msg)
                console.log("Email sent")
            } catch (error) {
                console.error(`Got error while sending mail, error: ${error}`)
            }
        }
    },
    sendAttendedAndInterestedEmail: async (infosession, jwtToken) => {
        let fullname = `${infosession.surname} ${infosession.firstname}`

        let msg = {
            to: infosession.email,
            from: "no-reply-onboarding@moove.africa",
            fromname: "Moove Africa",
            subject: "Drive Your Way Into Financial Freedom Today!",
        }
        
        switch (jwtToken.country) {
            case "Nigeria":
                msg.html = MailTemplates.Nigeria.attendedAndInterestedTemplate(fullname)
            break
            case "Ghana":
                msg.html = MailTemplates.Ghana.attendedAndInterestedTemplate(fullname)
            break
            case "South Africa":
                msg.html = MailTemplates.Southafrica.attendedAndInterestedTemplate(fullname)
            break
            case "Kenya":
            case "Uganda":
                msg.html = MailTemplates.Eastafrica.attendedAndInterestedTemplate(fullname)
            break
            case "United Kingdom":
                msg.html = MailTemplates.UK.attendedAndInterestedTemplate(fullname)
            break
            case "United Arab Emirates":
                msg.html = MailTemplates.UAE.attendedAndInterestedTemplate(fullname)
            break
        }

        if (msg.html !== undefined) {
            try {
                await mailSender.sendMail(msg)
                console.log("Email sent")
            } catch (error) {
                console.error(`Got error while sending mail, error: ${error}`)
            }
        }

    },
    sendInvitationToRegisterEmail: async (invitation) => {
        let fullname = `${invitation.surname} ${invitation.firstname}`

        let msg = {
            to: invitation.email,
            from: "no-reply-onboarding@moove.africa",
            fromname: "Moove Africa",
            subject: "Register and Get on the Moove!",
            html: MailTemplates.Ghana.invitationToRegisterTemplate(fullname, invitation.link),
        }

        await this.sendMail(msg)
    }
}

export default Handler
