package com.paulperson.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Home-screen "today agenda" widget. Renders the JSON file the web app keeps
 * fresh in the app's files dir (see src/lib/widgetAgenda.ts) — the widget has
 * no network or JS runtime of its own. Refreshes every 30 min via
 * updatePeriodMillis and whenever the launcher rebinds it.
 */
class AgendaWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_agenda)

            val serviceIntent = Intent(context, AgendaWidgetService::class.java)
            views.setRemoteAdapter(R.id.agenda_list, serviceIntent)
            views.setEmptyView(R.id.agenda_list, R.id.agenda_empty)

            val openApp = PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.agenda_root, openApp)
            views.setPendingIntentTemplate(R.id.agenda_list, openApp)

            appWidgetManager.updateAppWidget(id, views)
            appWidgetManager.notifyAppWidgetViewDataChanged(id, R.id.agenda_list)
        }
    }
}
