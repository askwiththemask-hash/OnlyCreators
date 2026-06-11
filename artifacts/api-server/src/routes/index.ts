import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import creatorsRouter from "./creators";
import samplesRouter from "./samples";
import interactionsRouter from "./interactions";
import requestsRouter from "./requests";
import statsRouter from "./stats";
import adminRouter from "./admin";
import storageRouter from "./storage";
import messagesRouter from "./messages";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(creatorsRouter);
router.use(samplesRouter);
router.use(interactionsRouter);
router.use(requestsRouter);
router.use(statsRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(messagesRouter);
router.use(notificationsRouter);

export default router;
