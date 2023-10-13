import express from 'express'
import { DataResponse, InternalErrResponse, InvalidTypeResponse, MessageResponse, NotFoundResponse } from '../common/reponses.js'
import { requireRole } from '../middlewares/auth.js'
import Semester from '../models/Semester.js'
import { Op } from 'sequelize'

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *    Semesters:
 *       type: object
 *       required:
 *          - season
 *          - year
 *       properties:
 *          id:
 *              type: integer
 *              description: Auto generate id
 *          season:
 *              type: STRING
 *              description: SPRING, SUMMER, FALL
 *          year:
 *              type: integer
 *              description: The year of the semester
 *       example:
 *           id: 1
 *           season: SPRING
 *           year: 2023
 */

/**
 * @swagger
 * tags:
 *    name: Semesters
 *    description: The Semesters managing API
 */

/**
 * @swagger
 * /semesters/:
 *   post:
 *     summary: Create a new Semester
 *     tags: [Semesters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               year:
 *                 type: integer
 *                 example: 2023, 2022, 2021
 *               season:
 *                 type: String
 *                 example: SPRING, SUMMER, FALL
 *           required:
 *             - year
 *             - season
 *     responses:
 *       '200':
 *         description: Create Success !
 *       '500':
 *         description: Internal Server Error !
 */

/**
 * @swagger
 * /semesters/:
 *   get:
 *     summary: Return all data of Semester
 *     tags: [Semesters]
 *     responses:
 *       '200':
 *         description: OK !
 *         content: 
 *           application/json:
 *             schema:
 *               type: array
 *               items: 
 *                 $ref: '#/components/schemas/Semesters'
 *       '500':
 *         description: Internal Server Error !
 */

/**
 * @swagger
 * /semesters:
 *   delete:
 *     summary: Delete a user.
 *     tags: [Semesters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *           required:
 *             - id
 *     responses:
 *       '200':
 *         description: Delete Successfully!
 *       '500':
 *         description: Internal Error!
 */

router.post('/', async (req, res) => {
    const year = parseInt(req.body.year);
    const season = req.body.season;

    try {
        const semester = await Semester.create({
            season: season,
            year: year
        })
        console.log(semester);
        res.json(MessageResponse("Create Success !"))

    } catch (err) {
        console.log(err)
        res.json(InternalErrResponse());
    }
})

router.get('/', async (req, res) => {
    try {
        const semester = await Semester.findAll();
        res.json(DataResponse(semester));
        return;
    } catch (err) {
        console.log(err);
        res.json(InternalErrResponse());
    }
})

router.delete('/', async (req, res) => {
    try {
        const id = req.body.id
        const semester = await Semester.findOne({
            where: {
                id: id
            }
        });
        if (!semester) {
            res.json(NotFoundResponse())
            return
        }

        var today = new Date()
        if (semester.year === today.getFullYear()) {
            await Semester.destroy({
                where: {
                    id: id
                }
            })
            res.json(MessageResponse('Delete successfully'))
        } else {
            res.json(MessageResponse('Only the current time can be deleted'))
        }
    } catch (err) {
        console.log(err);
        res.json(InternalErrResponse());
    }
})

export async function createNewSemester() {
    const date = new Date()
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let season
    if (month >= 1 && month <= 4) season = "SPRING"
    if (month >= 5 && month <= 8) season = "SUMMER"
    if (month >= 9 && month <= 12) season = "FALL"
    try {
        const semester = await Semester.create({
            season: season,
            year: year
        })
        return semester.id
    } catch (err) {
        console.log(err)
        res.json(InternalErrResponse());
    }
}

export default router
//add xong
