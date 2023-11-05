import express, { response } from 'express'
import { DataResponse, InternalErrResponse, InvalidTypeResponse, MessageResponse, NotFoundResponse } from '../common/reponses.js'
import { requireRole } from '../middlewares/auth.js'
import Room from '../models/Room.js'
import Examiner from '../models/Examiner.js'
import SubInSlot from '../models/SubInSlot.js'
import ExamRoom from '../models/ExamRoom.js'
import ExamSlot from '../models/ExamSlot.js'
import TimeSlot from '../models/TimeSlot.js'
import Course from '../models/Course.js'
import Subject from '../models/Subject.js'
import ExaminerLogTime from '../models/ExaminerLogTime.js'
import User from '../models/User.js'
import { Op } from 'sequelize'
import ExamPhase from '../models/ExamPhase.js'
import { getDetailScheduleOneExamSlot, addExaminerForStaff, addRoomByStaff, autoFillLecturerToExamRoom, delRoomByStaff, getAllAvailableExaminerInSlot, getAllCourseOneSlot, getAllExaminerOneSlot, getAllRoomOneSlot, lecRegister, lecUnRegister, getAllCourseAndNumOfStudentOneSlot } from '../services/examRoomService.js'

const router = express.Router()

router.get('/examinerDashBoard', async (req, res) => {
    const exPhaseId = parseInt(req.query.ePId);
    try {
        const statusMap = new Map([
            [0, 'lecturer'],
            [1, 'staff'],
            [2, 'volunteer']
        ]);
        let examinerLists = [];
        const exPhase = await ExamPhase.findOne({
            where: {
                id: exPhaseId
            }
        })
        if (exPhase) {
            const examiners = await ExaminerLogTime.findAll({
                where: {
                    day: {
                        [Op.gte]: exPhase.startDay, // Lấy examiner có day lớn hơn hoặc bằng startDay
                        [Op.lte]: exPhase.endDay,   // và nhỏ hơn hoặc bằng endDay
                    }
                }
            });
            if (examiners.length == 0) {
                res.json(MessageResponse("This phase has no examiners"));
                return;
            }
            const uniqueExaminers = examiners.reduce((acc, current) => {
                const x = acc.find(item => item.examinerId === current.examinerId);
                if (!x) {
                    return acc.concat([current]);
                } else {
                    return acc;
                }
            }, []);

            for (const item of uniqueExaminers) {
                const examiner = await Examiner.findOne({
                    where: {
                        id: item.examinerId,
                        semesterId: item.semId
                    }
                });

                const ex = {
                    exEmail: examiner.exEmail,
                    exName: examiner.exName,
                    role: statusMap.get(examiner.typeExaminer),
                    status: examiner.status
                };

                examinerLists.push(ex);
            }
            res.json(DataResponse(examinerLists.length));
            return;
        } else {
            res.json(NotFoundResponse());
            return;
        }
    } catch (err) {
        res.json(InternalErrResponse());
        console.log(err);
    }
    //trả ra email name, role, status
})

router.get('/totalSlotDashBoard', async (req, res) => {
    const exPhaseId = parseInt(req.query.ePId);
    try {
        const phase = await ExamPhase.findOne({
            where: {
                id: exPhaseId
            }
        });
        if (!phase) {
            res.json(NotFoundResponse());
            return;
        }

        const exSlot = await ExamSlot.findAll({
            where: {
                [Op.and]: [
                    { day: { [Op.gte]: phase.startDay } },
                    { day: { [Op.lte]: phase.endDay } }
                ]
            }
        });
        if (exSlot.length == 0) {
            res.json(MessageResponse("This phase doesn't have any slots"));
            return;
        }
        let totalSlot = 0;
        for (const slot of exSlot) {
            const subSlot = await SubInSlot.findAll({
                where: {
                    exSlId: slot.dataValues.id
                }
            })
            for (const sub of subSlot) {
                const exRoom = await ExamRoom.findAll({
                    where: {
                        sSId: sub.dataValues.id
                    }
                })
                totalSlot += exRoom.length;
            }
        }
        res.json(DataResponse(totalSlot));
        return;
    } catch (error) {
        console.log(error);
        res.json(InternalErrResponse());
    }
})

router.get('/topThreeExaminerDashBoard', async (req, res) => {
    const exPhaseId = parseInt(req.query.ePId);
    try {
        const phase = await ExamPhase.findOne({
            where: {
                id: exPhaseId
            }
        });

        const exSlot = await ExamSlot.findAll({
            where: {
                [Op.and]: [
                    { day: { [Op.gte]: phase.startDay } },
                    { day: { [Op.lte]: phase.endDay } }
                ]
            }
        });
        if (exSlot.length == 0) {
            res.json(MessageResponse("This phase doesn't have any slots"));
            return;
        }
        let examRoomWithExaminer = [];
        for (const slot of exSlot) {
            const subSlot = await SubInSlot.findAll({
                where: {
                    exSlId: slot.dataValues.id
                }
            })
            for (const sub of subSlot) {
                const exRoom = await ExamRoom.findAll({
                    where: {
                        sSId: sub.dataValues.id,
                        examinerId: { [Op.ne]: null }
                    }
                })
                if (exRoom.length != 0) {
                    for (const ex of exRoom) {
                        const s = {
                            sSId: ex.dataValues.sSId,
                            examinerId: ex.dataValues.examinerId
                        }
                        examRoomWithExaminer.push(s);
                    }
                }
            }
        }

        const examinerCount = {};

        for (const item of examRoomWithExaminer) {
            const examinerId = item.examinerId;
            if (examinerCount[examinerId]) {
                examinerCount[examinerId]++;
            } else {
                examinerCount[examinerId] = 1;
            }
        }
        const uniqueValues = [...new Set(Object.values(examinerCount))];
        uniqueValues.sort((a, b) => b - a);
        const top3UniqueValues = uniqueValues.slice(0, 1);

        const keysWithTopValues = [];

        for (const key in examinerCount) {
            const value = examinerCount[key];
            if (top3UniqueValues.includes(value)) {
                const s = {
                    id: key,
                    quantity: value,
                }
                keysWithTopValues.push(s);
            }
        }

        let returnL = [];
        for(const item of keysWithTopValues){
            const examiner = await Examiner.findOne({
                where: {
                    id: item.id
                }
            })
            const s = {
                exName: examiner.exName,
                exEmail: examiner.exEmail,
                quantity: item.quantity
            }
            returnL.push(s);
        }
        if(returnL.length != 0){
            res.json(DataResponse(returnL));
        }else{
            res.json(NotFoundResponse());
        }
    } catch (error) {
        console.log(error);
        res.json(InternalErrResponse());
    }
})

export default router