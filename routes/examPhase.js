import express from 'express'
import { DataResponse, InternalErrResponse, InvalidTypeResponse, MessageResponse, NotFoundResponse } from '../common/reponses.js'
import { requireRole } from '../middlewares/auth.js'
import Semester from '../models/Semester.js'
import ExamType from '../models/ExamType.js'
import ExamPhase from '../models/ExamPhase.js'
import Course from '../models/Course.js'
import Subject from '../models/Subject.js'
import { createNewSemester } from './semester.js'
import { countCourse } from './course.js'

const router = express.Router()

router.post('/', async (req, res) => {
    const semId = parseInt(req.body.semId);
    const eTId = parseInt(req.body.eTId);
    const startDay = req.body.startDay;
    const endDay = req.body.endDay;

    try {
        const semester = await Semester.findOne({
            where: {
                id: semId
            }
        })
        const examType = await ExamType.findOne({
            where: {
                id: eTId
            }
        })
        if (!semester || !examType) {
            res.json(NotFoundResponse());
            return;
        } else {
            const examPhase = await ExamPhase.create({
                semId: semId,
                eTId: eTId,
                startDay: startDay,
                endDay: endDay
            })
            console.log(examPhase);
            res.json(DataResponse(examPhase))
        }

    } catch (errer) {
        console.log(errer)
        res.json(InternalErrResponse());
    }
})

router.put('/', async (req, res) => { // Update ExamPhase
    const examPhaseUp = req.body
    const id = parseInt(examPhaseUp.examPhaseId)

    try {
        const check = await ExamPhase.update(examPhaseUp, {
            where: {
                id: id,
            }
        })
        if (check[0] === 0) {
            res.json(MessageResponse("ExamPhase Update !"))
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.delete('/', async (req, res) => { // Delete Exam Phase
    const id = parseInt(req.body.id)

    try {
        const result = await ExamPhase.destroy({
            where: {
                id: id,
            }
        })
        if (result === 0) {
            res.json(NotFoundResponse('Not found'))
        } else {
            res.json(MessageResponse('Exam Phase deleted'))
        }
    } catch (error) {
        console.log(error)
        res.json(MessageResponse('Error found'))
    }
})

router.get('/', async (req, res) => {
    const detailExamPhase = []
    function insertExamPhase(ss, y, t, bl, sd, ed) {
        const EPDetail = {
            sesson: ss, year: y, type: t, block: bl, SDay: sd, EDay: ed
        }
        detailExamPhase.push(EPDetail)
    }
    try {
        const examPhases = await ExamPhase.findAll()

        for (let i = 0; i < examPhases.length; i++) {
            const semester = await Semester.findOne({
                where: {
                    id: examPhases[i].semId
                }
            })

            const examType = await ExamType.findOne({
                where: {
                    id: examPhases[i].eTId
                }
            })

            if (semester && examType) {
                insertExamPhase(semester.season, semester.year, examType.type, examType.block, examPhases[i].startDay, examPhases[i].endDay)
            }
        }
    } catch (error) {
        console.log(error);
        res.json(MessageResponse('Error found'))
    }
    res.json(DataResponse(detailExamPhase))
})
export async function createExamPhases(course, semesterId) {
    try {
        const date = new Date()
        let month = date.getMonth() + 1
        let blockNow = 10
        let desNow = 0
        // 0 is normal
        //{numFE : FE, numPE : PE, numFEc : FEc, numPEc : PEc}

        let examPhaseList = []

        if (month == 4 || month == 8 || month == 12) blockNow = 5

        const promises = [];

        for (const key in course) {
            if (course.hasOwnProperty(key)) {
                const val = course[key];
                if (val > 0) {
                    if (key.includes("c")) desNow = 1;
                    const promise = (async () => {
                        const examType = await ExamType.findOne({
                            where: {
                                type: key.slice(3, 5),
                                block: blockNow,
                                des: desNow,
                            },
                        });
                        const examPhase = await ExamPhase.create({
                            semId: semesterId,
                            eTId: examType.id,
                        });
                        return examPhase;
                    })();
                    promises.push(promise);
                }
            }
        }

        return Promise.all(promises)
    } catch (err) {
        console.log(err)
    }
}

export default router