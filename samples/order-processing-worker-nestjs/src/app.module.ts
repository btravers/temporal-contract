import { Module } from "@nestjs/common";
import { ActivitiesModule } from "./activities/activities.module.js";

/**
 * Root application module
 */
@Module({
  imports: [ActivitiesModule],
})
export class AppModule {}
